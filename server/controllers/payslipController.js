const { db } = require('../database/db');
const path = require('path');
const fs = require('fs');

exports.getAll = (req, res) => {
  const { page = 1, limit = 10, annee } = req.query;
  const offset = (page - 1) * limit;
  const matricule = req.user.matricule;

  let query = 'SELECT * FROM payslips WHERE matricule=?';
  let countQuery = 'SELECT COUNT(*) as total FROM payslips WHERE matricule=?';
  const params = [matricule];

  if (annee) {
    query += ' AND annee=?';
    countQuery += ' AND annee=?';
    params.push(annee);
  }

  query += ' ORDER BY annee DESC, mois DESC LIMIT ? OFFSET ?';
  const rows = db.prepare(query).all(...params, parseInt(limit), parseInt(offset));
  const { total } = db.prepare(countQuery).get(...params);

  res.json({ data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
};

exports.getByMatricule = (req, res) => {
  const matricule = req.params.matricule.toUpperCase();
  if (req.user.matricule !== matricule) return res.status(403).json({ message: 'Accès refusé' });

  const rows = db.prepare('SELECT * FROM payslips WHERE matricule=? ORDER BY annee DESC, mois DESC').all(matricule);
  res.json(rows);
};

exports.getOne = (req, res) => {
  const { matricule, annee, mois } = req.params;
  if (req.user.matricule !== matricule.toUpperCase()) return res.status(403).json({ message: 'Accès refusé' });

  const row = db.prepare('SELECT * FROM payslips WHERE matricule=? AND annee=? AND mois=?').get(matricule.toUpperCase(), annee, mois);
  if (!row) return res.status(404).json({ message: 'Bulletin introuvable' });
  res.json(row);
};

exports.getYears = (req, res) => {
  const years = db.prepare('SELECT DISTINCT annee FROM payslips WHERE matricule=? ORDER BY annee DESC').all(req.user.matricule);
  res.json(years.map(r => r.annee));
};

exports.download = (req, res) => {
  const payslip = db.prepare('SELECT * FROM payslips WHERE id=? AND matricule=?').get(req.params.id, req.user.matricule);
  if (!payslip) return res.status(404).json({ message: 'Bulletin introuvable ou accès refusé' });

  const pdfDir = process.env.PDF_DIR || './pdf';
  const filePath = path.resolve(pdfDir, payslip.fichier_pdf);

  if (!fs.existsSync(filePath)) {
    // Generate a demo PDF HTML if file not found
    const html = generateDemoPDF(payslip);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${payslip.fichier_pdf.replace('.pdf','.html')}"`);
    return res.send(html);
  }

  res.download(filePath, payslip.fichier_pdf);
};

function generateDemoPDF(p) {
  const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Bulletin ${p.mois} ${p.annee}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 24px;color:#111}
.header{border-bottom:3px solid #1a237e;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
.company{font-size:24px;font-weight:bold;color:#1a237e}.period{font-size:13px;color:#666;text-align:right}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;background:#f5f7ff;padding:16px;border-radius:8px;margin-bottom:24px}
.info-item label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;display:block}
.info-item span{font-size:14px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#1a237e;color:#fff;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
td{padding:10px 12px;font-size:14px;border-bottom:1px solid #eee}
.net-row td{font-weight:bold;font-size:16px;background:#e8f5e9;color:#1b5e20;border-top:2px solid #1a237e}
.footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="header"><div><div class="company">Acme Corp. Sénégal</div><div style="font-size:13px;color:#888">Bulletin de Paie</div></div>
<div class="period"><strong>${p.mois} ${p.annee}</strong><br>Matricule: ${p.matricule}</div></div>
<div class="info-grid">
  <div class="info-item"><label>Employé</label><span>${p.prenom} ${p.nom}</span></div>
  <div class="info-item"><label>Matricule</label><span>${p.matricule}</span></div>
</div>
<table>
  <thead><tr><th>Libellé</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    <tr><td>Salaire Brut</td><td style="text-align:right">${fmt(p.salaire_brut)}</td></tr>
    <tr><td>CNSS (part salariale)</td><td style="text-align:right;color:#c62828">−${fmt(p.salaire_brut * 0.057)}</td></tr>
    <tr><td>IPRES (retraite)</td><td style="text-align:right;color:#c62828">−${fmt(p.salaire_brut * 0.056)}</td></tr>
    <tr><td>IR (Impôt sur le revenu)</td><td style="text-align:right;color:#c62828">−${fmt(p.salaire_brut - p.salaire_net - p.salaire_brut*0.113)}</td></tr>
    <tr class="net-row"><td>Net à Payer</td><td style="text-align:right">${fmt(p.salaire_net)}</td></tr>
  </tbody>
</table>
<div class="footer">Document généré automatiquement — ${new Date().toLocaleDateString('fr-FR')} — Acme Corp. Sénégal</div>
</body></html>`;
}
