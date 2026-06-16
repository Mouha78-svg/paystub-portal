const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const { pool } = require('../database/db');
const { generatePin } = require('../utils/generatePin');

// ── CSV / ZIP helpers ────────────────────────────────────────────────────────

function parseRow(row, errors) {
  const {
    matricule, nom, prenom, service, email, is_admin, pin,
    mois, annee, numero, salaire_brut, salaire_net, fichier_pdf,
  } = row;

  if (!matricule || !mois || !annee || !salaire_brut || !salaire_net) {
    errors.push(`Ligne ignorée (champs manquants): ${JSON.stringify(row)}`);
    return null;
  }
  const num = parseInt(numero) || 1;
  if (num < 1 || num > 2) {
    errors.push(`Ligne ignorée (numero invalide, doit être 1 ou 2): ${JSON.stringify(row)}`);
    return null;
  }
  const mat = matricule.trim().toUpperCase();
  const ann = parseInt(annee);
  const moisTrim = mois.trim();
  return {
    matricule: mat,
    nom: nom?.trim() || '',
    prenom: prenom?.trim() || '',
    service: service?.trim() || '',
    email: email?.trim() || null,
    is_admin: ['1', 'true', 'oui', 'yes'].includes((is_admin || '').trim().toLowerCase()) ? 1 : 0,
    pin: pin?.trim() || generatePin(),
    mois: moisTrim,
    annee: ann,
    numero: num,
    salaire_brut: parseFloat(salaire_brut),
    salaire_net: parseFloat(salaire_net),
    fichier_pdf: fichier_pdf?.trim() || `${mat}_${ann}_${moisTrim}_${num}.pdf`,
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
      `INSERT INTO payslips (matricule, nom, prenom, mois, annee, numero, salaire_brut, salaire_net, fichier_pdf, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT(matricule, mois, annee, numero) DO UPDATE SET
         nom=EXCLUDED.nom, prenom=EXCLUDED.prenom,
         salaire_brut=EXCLUDED.salaire_brut, salaire_net=EXCLUDED.salaire_net,
         fichier_pdf=EXCLUDED.fichier_pdf, synced_at=NOW()`,
      [r.matricule, r.nom, r.prenom, r.mois, r.annee, r.numero, r.salaire_brut, r.salaire_net, r.fichier_pdf]
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
      return res.status(400).json({ message: "Aucun fichier CSV trouvé dans l'archive ZIP" });
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
      fs.copyFileSync(path.join(extractDir, pdfFile), path.join(pdfDir, pdfFile));
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

// ── Bulletin PDF multi-pages — background job processing ─────────────────────

// In-memory job store (single-instance deployment)
const jobs = new Map();

const MONTH_MAP = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
};

function parseAmount(str) {
  if (!str) return 0;
  // Remove all whitespace (incl. non-breaking spaces) before parsing
  const v = parseFloat(str.trim().replace(/[\s ]/g, '').replace(',', '.'));
  return isNaN(v) || v < 0 ? 0 : v;
}

function parseSalaries(text) {
  const t = text.replace(/\s+/g, ' ');
  let salaire_brut = 0;
  let salaire_net  = 0;

  // AMT matches either a French space-separated integer ("617 524") or a
  // plain integer 4-10 digits ("376132"). [^\d]+ before AMT skips any
  // non-digit junk between label and amount (underscores, asterisks, etc.).
  const AMT = '(\\d{1,3}(?:[\\s ]\\d{3})+|\\d{4,10})';

  const brutPatterns = [
    new RegExp('Total\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Traitement\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Montant\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Salaire\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Brut\\s+Imposable[^\\d]+' + AMT, 'i'),
  ];
  for (const p of brutPatterns) {
    const m = t.match(p);
    if (m) {
      const val = parseAmount(m[1]);
      if (val > 10000) { salaire_brut = val; break; }
    }
  }

  const netPatterns = [
    new RegExp('Net\\s+[\xc3\xa0a]\\s+[Pp]ayer[^\\d]+' + AMT, 'i'),
    new RegExp('Net\\s+Pay[e\xc3\xa9][^\\d]+' + AMT, 'i'),
    new RegExp('Net\\s+Fiscal[^\\d]+' + AMT, 'i'),
    new RegExp('Montant\\s+Net[^\\d]+' + AMT, 'i'),
  ];
  for (const p of netPatterns) {
    const m = t.match(p);
    if (m) {
      const val = parseAmount(m[1]);
      if (val > 10000) { salaire_net = val; break; }
    }
  }

  return { salaire_brut, salaire_net };
}
function parseBulletinPage(text) {
  const t = text.replace(/\s+/g, ' ');

  // Match matricule: e.g. "Matricule EMP001" or "Matricule : EMP001"
  const mMat = t.match(/[Mm]atricule\s*:?\s*([A-Z]{1,5}[0-9]{2,6})/i)
            || t.match(/[Mm]atricule\s*:?\s*(\S+)/i);

  // Match period: "Période du DD/MM/YYYY" (handles é or e)
  const mPer = t.match(/[Pp][eé]riode\s+du\s+(\d{2})\/(\d{2})\/(\d{2,4})/i);

  if (!mMat || !mPer) return null;

  const matricule = mMat[1].trim().toUpperCase();
  const monthNum  = mPer[2].padStart(2, '0');
  const yearRaw   = parseInt(mPer[3]);
  const year      = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const mois      = MONTH_MAP[monthNum] || monthNum;

  return { matricule, monthNum, year, mois };
}

function parseEmployeeName(text) {
  const t = text.replace(/\s+/g, ' ');
  // Name follows a civility prefix (M, Mme) and precedes a geographic
  // or section landmark present in both generated and real CROUS bulletins.
  const m = t.match(/\bM(?:me?)?\.?\s+(.+?)(?=\s+(?:SAINT[\s\-]LOUIS|Cong[eé]s|Conv\.\s*coll))/i);
  if (!m) return null;
  const full  = m[1].trim();
  const words = full.split(' ');
  // Leading all-uppercase tokens (incl. accented caps A-Z, À-Ö, Ø-Þ) = nom;
  // first mixed-case token onward = prenom
  let split = 0;
  for (const w of words) {
    if (/^[A-Z\u00C0-\u00D6\u00D8-\u00DE\-]+$/.test(w)) split++;
    else break;
  }
  if (split === 0)           return { nom: words[0] || full, prenom: words.slice(1).join(' ') || 'À renseigner' };
  if (split >= words.length) return { nom: full,             prenom: 'À renseigner' };
  return { nom: words.slice(0, split).join(' '), prenom: words.slice(split).join(' ') };
}

async function stampPage(pdfDoc, emp, info) {
  const page = pdfDoc.getPages()[0];
  const { width } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const label = emp
    ? `${info.matricule} — ${emp.prenom} ${emp.nom} | ${info.mois} ${info.year}`
    : `${info.matricule} | ${info.mois} ${info.year}`;

  page.drawRectangle({ x: 0, y: 0, width, height: 18, color: rgb(0.88, 0.88, 0.88), opacity: 0.9 });
  page.drawText(label, { x: 10, y: 4, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
}

// Start background job and return jobId immediately
exports.syncBulletinPDF = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier PDF fourni' });

  const jobId = uuidv4();
  jobs.set(jobId, {
    status: 'parsing',
    progress: 0,
    total: 0,
    saved: 0,
    created: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    doneAt: null,
    errorMessage: null,
  });

  // Respond immediately so the client doesn't time out
  res.json({ jobId });

  // Process asynchronously — errors update job.status to 'error'
  processBulletinAsync(req.file.path, jobId).catch(err => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.errorMessage = err.message;
      job.doneAt = new Date().toISOString();
    }
  });
};

// Poll endpoint — called by frontend every ~1.5 s
exports.getBulletinJobStatus = (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Tâche introuvable ou expirée' });
  res.json(job);
};

async function processBulletinAsync(filePath, jobId) {
  const job = jobs.get(jobId);
  const pdfDir = path.resolve(process.env.PDF_DIR || './pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  const fileBuffer = fs.readFileSync(filePath);

  // ── Step 1: single-pass text extraction (one pdf-parse call for all pages) ──
  const pageTexts = [];
  try {
    await pdfParse(fileBuffer, {
      pagerender: (pageData) =>
        pageData.getTextContent({ normalizeWhitespace: true }).then(tc => {
          const text = tc.items.map(i => i.str).join(' ');
          pageTexts.push(text);
          return text;
        }),
    });
  } catch (e) {
    throw new Error(`Impossible d'extraire le texte du PDF : ${e.message}`);
  }

  // ── Step 2: load PDF for splitting / stamping ────────────────────────────
  job.status = 'processing';
  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(fileBuffer);
  } catch (e) {
    throw new Error(`PDF invalide ou corrompu : ${e.message}`);
  }

  const totalPages = srcDoc.getPageCount();
  job.total = totalPages;

  const seenPages = new Map();
  const empCache  = new Map();

  // ── Step 3: process each page ────────────────────────────────────────────
  for (let i = 0; i < totalPages; i++) {
    job.progress = i + 1;

    const pageText = pageTexts[i] || '';
    const info = parseBulletinPage(pageText);

    if (!info) {
      job.errors.push(`Page ${i + 1} : en-tête non reconnu (matricule/période introuvable)`);
      continue;
    }

    // Assign bulletin numero (max 2 per employee/month)
    const pageKey = `${info.matricule}_${info.year}_${info.monthNum}`;
    const numero  = (seenPages.get(pageKey) || 0) + 1;
    if (numero > 2) {
      job.errors.push(`Page ${i + 1} : plus de 2 bulletins pour ${info.matricule} ${info.mois} ${info.year} — ignoré`);
      continue;
    }
    seenPages.set(pageKey, numero);

    const filename = `${info.matricule}_${info.year}_${info.monthNum}_${numero}.pdf`;
    const { salaire_brut, salaire_net } = parseSalaries(pageText);

    // Cache employee lookup
    if (!empCache.has(info.matricule)) {
      const { rows } = await pool.query(
        'SELECT nom, prenom FROM employees WHERE matricule=$1', [info.matricule]
      );
      empCache.set(info.matricule, rows[0] || null);
    }
    let emp = empCache.get(info.matricule);

    if (!emp) {
      // Auto-create the employee from data extracted from this page
      const nameInfo = parseEmployeeName(pageText);
      const nom    = nameInfo?.nom    || `EMPLOYE_${info.matricule}`;
      const prenom = nameInfo?.prenom || 'À renseigner';
      const deptM  = pageText.replace(/\s+/g, ' ').match(/D[eé]partement\s+(.+?)(?=\s+Cat[ée]gorie)/i);
      const service = deptM ? deptM[1].trim() : 'Non défini';
      const pin    = generatePin();
      try {
        await pool.query(
          `INSERT INTO employees (matricule, nom, prenom, service, pin, is_admin, is_active, first_login)
           VALUES ($1, $2, $3, $4, $5, 0, 0, 1)
           ON CONFLICT (matricule) DO NOTHING`,
          [info.matricule, nom, prenom, service, pin]
        );
        // Fetch the actual row (handles rare concurrent-insert race)
        const { rows: empRows } = await pool.query(
          'SELECT nom, prenom FROM employees WHERE matricule=$1', [info.matricule]
        );
        emp = empRows[0] || { nom, prenom };
        empCache.set(info.matricule, emp);
        job.created++;
        job.errors.push(`[Employé créé] ${info.matricule} — ${nom} ${prenom} | PIN initial : ${pin}`);
      } catch (e) {
        job.errors.push(`Page ${i + 1}�: impossible de créer l'employé ${info.matricule} — ${e.message}`);
        continue;
      }
    }

    // Extract page, stamp, write to disk
    try {
      const out = await PDFDocument.create();
      const [copiedPage] = await out.copyPages(srcDoc, [i]);
      out.addPage(copiedPage);
      await stampPage(out, emp, { matricule: info.matricule, mois: info.mois, year: info.year });
      fs.writeFileSync(path.join(pdfDir, filename), Buffer.from(await out.save()));
    } catch (e) {
      job.errors.push(`Page ${i + 1} (${info.matricule}) : erreur sauvegarde PDF — ${e.message}`);
      continue;
    }

    // Upsert payslip: update salary only when extracted value > 0 (don't clobber existing CSV data)
    try {
      await pool.query(
        `INSERT INTO payslips
           (matricule, nom, prenom, mois, annee, numero, salaire_brut, salaire_net, fichier_pdf, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT(matricule,mois,annee,numero) DO UPDATE SET
           nom          = CASE WHEN EXCLUDED.nom != ''         THEN EXCLUDED.nom         ELSE payslips.nom          END,
           prenom       = CASE WHEN EXCLUDED.prenom != ''      THEN EXCLUDED.prenom      ELSE payslips.prenom       END,
           salaire_brut = CASE WHEN EXCLUDED.salaire_brut > 0  THEN EXCLUDED.salaire_brut ELSE payslips.salaire_brut END,
           salaire_net  = CASE WHEN EXCLUDED.salaire_net  > 0  THEN EXCLUDED.salaire_net  ELSE payslips.salaire_net  END,
           fichier_pdf  = EXCLUDED.fichier_pdf,
           synced_at    = NOW()`,
        [info.matricule, emp.nom, emp.prenom, info.mois, info.year, numero,
         salaire_brut, salaire_net, filename]
      );
      job.saved++;
    } catch (e) {
      job.errors.push(`Page ${i + 1} (${info.matricule}) : erreur base de données — ${e.message}`);
    }
  }

  job.status  = 'done';
  job.doneAt  = new Date().toISOString();

  try { fs.unlinkSync(filePath); } catch (_) {}

  // Auto-expire job after 10 minutes
  setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}
