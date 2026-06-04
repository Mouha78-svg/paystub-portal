const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { db } = require('../database/db');

const DEFAULT_PIN = 'Crous2025';

exports.syncCSV = (req, res) => {
  const csvPath = req.file ? req.file.path : path.resolve(process.env.CSV_PATH || './csv/payslips.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ message: `Fichier CSV introuvable: ${csvPath}` });
  }

  const results = [];
  const errors = [];

  fs.createReadStream(csvPath)
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
    .on('end', () => {
      if (results.length === 0) {
        return res.status(400).json({ message: 'Aucune donnée valide dans le CSV', errors });
      }

      const upsertPayslip = db.prepare(`
        INSERT INTO payslips (matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(matricule, mois, annee) DO UPDATE SET
          nom=excluded.nom, prenom=excluded.prenom,
          salaire_brut=excluded.salaire_brut, salaire_net=excluded.salaire_net,
          fichier_pdf=excluded.fichier_pdf, synced_at=excluded.synced_at
      `);

      // Upsert employee: create with all fields; for existing employees update
      // nom/prenom/service/email/is_admin but never touch password_hash or reset first_login.
      const upsertEmployee = db.prepare(`
        INSERT INTO employees (matricule, nom, prenom, service, email, pin, is_admin, is_active, first_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
        ON CONFLICT(matricule) DO UPDATE SET
          nom = excluded.nom,
          prenom = excluded.prenom,
          service = CASE WHEN excluded.service != '' THEN excluded.service ELSE employees.service END,
          email = CASE WHEN excluded.email IS NOT NULL THEN excluded.email ELSE employees.email END,
          is_admin = excluded.is_admin,
          updated_at = datetime('now')
      `);

      const sync = db.transaction((rows) => {
        let count = 0;
        for (const r of rows) {
          if (r.nom && r.prenom) {
            upsertEmployee.run(
              r.matricule, r.nom, r.prenom,
              r.service || 'Non défini', r.email, r.pin, r.is_admin,
            );
          }
          upsertPayslip.run(
            r.matricule, r.nom, r.prenom, r.mois, r.annee,
            r.salaire_brut, r.salaire_net, r.fichier_pdf,
          );
          count++;
        }
        return count;
      });

      try {
        const count = sync(results);
        res.json({ message: `Synchronisation réussie: ${count} bulletin(s) importé(s)`, count, errors });
      } catch (err) {
        res.status(500).json({ message: 'Erreur lors de l\'insertion', error: err.message });
      }

      if (req.file) fs.unlinkSync(csvPath);
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'Erreur lecture CSV', error: err.message });
    });
};
