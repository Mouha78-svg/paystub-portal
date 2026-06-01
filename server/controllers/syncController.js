const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { db } = require('../database/db');

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
      const { matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf } = row;
      if (!matricule || !mois || !annee || !salaire_brut || !salaire_net) {
        errors.push(`Ligne ignorée (champs manquants): ${JSON.stringify(row)}`);
        return;
      }
      results.push({
        matricule: matricule.trim().toUpperCase(),
        nom: nom?.trim() || '',
        prenom: prenom?.trim() || '',
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

      const upsert = db.prepare(`
        INSERT INTO payslips (matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(matricule, mois, annee) DO UPDATE SET
          nom=excluded.nom, prenom=excluded.prenom,
          salaire_brut=excluded.salaire_brut, salaire_net=excluded.salaire_net,
          fichier_pdf=excluded.fichier_pdf, synced_at=excluded.synced_at
      `);

      const insertMany = db.transaction((rows) => {
        let inserted = 0;
        for (const r of rows) {
          upsert.run(r.matricule, r.nom, r.prenom, r.mois, r.annee, r.salaire_brut, r.salaire_net, r.fichier_pdf);
          inserted++;
        }
        return inserted;
      });

      try {
        const count = insertMany(results);
        // Auto-create employee stubs if not in employees table
        for (const r of results) {
          const emp = db.prepare('SELECT id FROM employees WHERE matricule=?').get(r.matricule);
          if (!emp && r.nom && r.prenom) {
            db.prepare(`INSERT OR IGNORE INTO employees (matricule, nom, prenom, service, pin) VALUES (?, ?, ?, 'Non défini', '0000')`).run(r.matricule, r.nom, r.prenom);
          }
        }
        res.json({ message: `Synchronisation réussie: ${count} bulletin(s) importé(s)`, count, errors });
      } catch (err) {
        res.status(500).json({ message: 'Erreur lors de l\'insertion', error: err.message });
      }

      // Clean up uploaded file if it was a multipart upload
      if (req.file) fs.unlinkSync(csvPath);
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'Erreur lecture CSV', error: err.message });
    });
};
