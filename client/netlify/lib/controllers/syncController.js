const { Readable } = require('stream');
const csv = require('csv-parser');
const { pool } = require('../db');

const DEFAULT_PIN = 'Crous2025';

exports.syncCSV = (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'Veuillez joindre un fichier CSV à importer.' });
  }

  const results = [];
  const errors = [];

  Readable.from(req.file.buffer)
    .pipe(csv())
    .on('data', (row) => {
      const {
        matricule, nom, prenom, service, email, is_admin, pin,
        mois, annee, salaire_brut, salaire_net, fichier_pdf,
      } = row;

      if (!matricule || !mois || !annee || !salaire_brut || !salaire_net) {
        errors.push(`Ligne ignorée (champs manquants): ${JSON.stringify(row)}`);
        return;
      }
      results.push({
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
        fichier_pdf: fichier_pdf?.trim() || `${matricule}_${annee}_${mois}.pdf`,
      });
    })
    .on('end', async () => {
      if (results.length === 0) {
        return res.status(400).json({ message: 'Aucune donnée valide dans le CSV', errors });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

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

        await client.query('COMMIT');
        res.json({ message: `Synchronisation réussie: ${count} bulletin(s) importé(s)`, count, errors });
      } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: "Erreur lors de l'insertion", error: err.message });
      } finally {
        client.release();
      }
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'Erreur lecture CSV', error: err.message });
    });
};
