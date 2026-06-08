const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database/db');

const DEFAULT_PIN = 'Crous2025';

function parseRow(row, errors) {
  const {
    matricule, nom, prenom, service, email, is_admin, pin,
    mois, annee, salaire_brut, salaire_net, fichier_pdf,
  } = row;

  if (!matricule || !mois || !annee || !salaire_brut || !salaire_net) {
    errors.push(`Ligne ignorée (champs manquants): ${JSON.stringify(row)}`);
    return null;
  }
  return {
    matricule: matricule.trim().toUpperCase(),
    nom: nom?.trim() || '',
    prenom: prenom?.trim() || '',
    service: service?.trim() || '',
    email: email?.trim() || null,
    is_admin: ['1', 'true', 'oui', 'yes'].includes((is_admin || '').trim().toLowerCase()) ? 1 : 0,
    pin: pin?.trim() || DEFAULT_PIN,
    mois: mois.trim(),
    annee: parseInt(annee),
    salaire_brut: parseFloat(salaire_brut),
    salaire_net: parseFloat(salaire_net),
    fichier_pdf: fichier_pdf?.trim() || `${matricule.trim().toUpperCase()}_${annee}_${mois.trim()}.pdf`,
  };
}

async function upsertRows(results, client) {
  let count = 0;
  for (const r of results) {
    if (r.nom && r.prenom) {
      await client.query(
        `INSERT INTO employees (matricule, nom, prenom, service, email, pin, is_admin, is_active, first_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1)
         ON CONFLICT(matricule) DO UPDATE SET
           nom = EXCLUDED.nom,
           prenom = EXCLUDED.prenom,
           service = CASE WHEN EXCLUDED.service != '' THEN EXCLUDED.service ELSE employees.service END,
           email = CASE WHEN EXCLUDED.email IS NOT NULL THEN EXCLUDED.email ELSE employees.email END,
           is_admin = EXCLUDED.is_admin,
           updated_at = NOW()`,
        [r.matricule, r.nom, r.prenom, r.service || 'Non défini', r.email, r.pin, r.is_admin]
      );
    }
    await client.query(
      `INSERT INTO payslips (matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT(matricule, mois, annee) DO UPDATE SET
         nom=EXCLUDED.nom, prenom=EXCLUDED.prenom,
         salaire_brut=EXCLUDED.salaire_brut, salaire_net=EXCLUDED.salaire_net,
         fichier_pdf=EXCLUDED.fichier_pdf, synced_at=NOW()`,
      [r.matricule, r.nom, r.prenom, r.mois, r.annee, r.salaire_brut, r.salaire_net, r.fichier_pdf]
    );
    count++;
  }
  return count;
}

function parseCsvStream(csvPath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const parsed = parseRow(row, errors);
        if (parsed) results.push(parsed);
      })
      .on('end', () => resolve({ results, errors }))
      .on('error', reject);
  });
}

exports.syncCSV = (req, res, next) => {
  const csvPath = req.file ? req.file.path : path.resolve(process.env.CSV_PATH || './csv/payslips.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ message: `Fichier CSV introuvable: ${csvPath}` });
  }

  parseCsvStream(csvPath)
    .then(async ({ results, errors }) => {
      if (results.length === 0) {
        return res.status(400).json({ message: 'Aucune donnée valide dans le CSV', errors });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const count = await upsertRows(results, client);
        await client.query('COMMIT');
        res.json({ message: `Synchronisation réussie: ${count} bulletin(s) importé(s)`, count, errors });
      } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: "Erreur lors de l'insertion", error: err.message });
      } finally {
        client.release();
        if (req.file) fs.unlinkSync(csvPath);
      }
    })
    .catch((err) => {
      res.status(500).json({ message: 'Erreur lecture CSV', error: err.message });
    });
};

exports.syncPDFs = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Aucun fichier PDF fourni' });
  }

  const pdfDir = path.resolve(process.env.PDF_DIR || './pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  const stored = [];
  const errors = [];

  for (const file of req.files) {
    const originalName = file.originalname;
    if (!originalName.toLowerCase().endsWith('.pdf')) {
      errors.push(`Fichier ignoré (pas un PDF): ${originalName}`);
      try { fs.unlinkSync(file.path); } catch (_) {}
      continue;
    }
    try {
      fs.copyFileSync(file.path, path.join(pdfDir, originalName));
      stored.push(originalName);
    } catch (err) {
      errors.push(`Erreur lors du stockage de ${originalName}: ${err.message}`);
    } finally {
      try { fs.unlinkSync(file.path); } catch (_) {}
    }
  }

  // Count how many stored PDFs match an existing payslip record
  let matched = 0;
  if (stored.length > 0) {
    const placeholders = stored.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM payslips WHERE fichier_pdf IN (${placeholders})`,
      stored
    );
    matched = parseInt(rows[0].cnt);
  }

  res.json({
    message: `${stored.length} PDF(s) importé(s), ${matched} correspondance(s) trouvée(s) en base`,
    pdfsImported: stored.length,
    matched,
    errors,
  });
};

exports.syncZIP = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier ZIP fourni' });
  }

  const zipPath = req.file.path;
  const extractDir = path.join('/tmp/zip-extracts', uuidv4());
  const pdfDir = path.resolve(process.env.PDF_DIR || './pdf');

  try {
    fs.mkdirSync(extractDir, { recursive: true });
    fs.mkdirSync(pdfDir, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    const allFiles = fs.readdirSync(extractDir);
    const csvFiles = allFiles.filter(f => f.toLowerCase().endsWith('.csv'));
    const pdfFiles = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));

    if (csvFiles.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier CSV trouvé dans l\'archive ZIP' });
    }
    if (csvFiles.length > 1) {
      return res.status(400).json({ message: `Plusieurs fichiers CSV trouvés dans l'archive (${csvFiles.join(', ')}). Un seul est autorisé.` });
    }

    const csvPath = path.join(extractDir, csvFiles[0]);
    const { results, errors } = await parseCsvStream(csvPath);

    if (results.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée valide dans le CSV', errors });
    }

    const client = await pool.connect();
    let count = 0;
    try {
      await client.query('BEGIN');
      count = await upsertRows(results, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: "Erreur lors de l'insertion", error: err.message });
    } finally {
      client.release();
    }

    let pdfsImported = 0;
    for (const pdfFile of pdfFiles) {
      const src = path.join(extractDir, pdfFile);
      const dest = path.join(pdfDir, pdfFile);
      fs.copyFileSync(src, dest);
      pdfsImported++;
    }

    res.json({
      message: `Synchronisation réussie: ${count} bulletin(s) et ${pdfsImported} PDF(s) importé(s)`,
      count,
      pdfsImported,
      errors,
    });
  } catch (err) {
    next(err);
  } finally {
    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}
    try { fs.unlinkSync(zipPath); } catch (_) {}
  }
};
