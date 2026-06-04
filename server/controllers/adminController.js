const { db } = require('../database/db');
const path = require('path');
const fs = require('fs');

const DEFAULT_PIN = 'Crous2025';

exports.getUsers = (req, res) => {
  const users = db.prepare(`
    SELECT matricule, nom, prenom, service, email, is_active, is_admin, first_login, created_at, updated_at
    FROM employees ORDER BY created_at DESC
  `).all();
  res.json(users);
};

exports.createUser = (req, res) => {
  const { matricule, nom, prenom, service, email, pin, is_admin = 0 } = req.body;
  if (!matricule || !nom || !prenom || !service)
    return res.status(400).json({ message: 'Matricule, nom, prénom et service requis' });

  const effectivePin = pin?.trim() || DEFAULT_PIN;

  try {
    db.prepare(`
      INSERT INTO employees (matricule, nom, prenom, service, email, pin, is_admin, is_active, first_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).run(matricule.toUpperCase(), nom.trim(), prenom.trim(), service.trim(), email?.trim() || null, effectivePin, is_admin ? 1 : 0);

    res.status(201).json({ message: 'Employé créé', matricule: matricule.toUpperCase(), pin: effectivePin });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ message: 'Ce matricule existe déjà' });
    throw e;
  }
};

exports.updateUser = (req, res) => {
  const { matricule } = req.params;
  const { nom, prenom, service, email, is_admin, is_active } = req.body;

  const emp = db.prepare('SELECT * FROM employees WHERE matricule=?').get(matricule.toUpperCase());
  if (!emp) return res.status(404).json({ message: 'Employé introuvable' });

  db.prepare(`
    UPDATE employees SET nom=?, prenom=?, service=?, email=?, is_admin=?, is_active=?, updated_at=datetime('now')
    WHERE matricule=?
  `).run(
    nom !== undefined ? nom.trim() : emp.nom,
    prenom !== undefined ? prenom.trim() : emp.prenom,
    service !== undefined ? service.trim() : emp.service,
    email !== undefined ? (email.trim() || null) : emp.email,
    is_admin !== undefined ? (is_admin ? 1 : 0) : emp.is_admin,
    is_active !== undefined ? (is_active ? 1 : 0) : emp.is_active,
    matricule.toUpperCase()
  );

  res.json({ message: 'Employé mis à jour' });
};

exports.deleteUser = (req, res) => {
  const { matricule } = req.params;
  if (matricule.toUpperCase() === req.user.matricule)
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });

  const result = db.prepare('DELETE FROM employees WHERE matricule=?').run(matricule.toUpperCase());
  if (result.changes === 0) return res.status(404).json({ message: 'Employé introuvable' });
  res.json({ message: 'Employé supprimé' });
};

exports.resetPassword = (req, res) => {
  const { matricule } = req.params;
  const { pin } = req.body;

  const emp = db.prepare('SELECT * FROM employees WHERE matricule=?').get(matricule.toUpperCase());
  if (!emp) return res.status(404).json({ message: 'Employé introuvable' });

  const newPin = pin?.trim() || DEFAULT_PIN;

  db.prepare(`
    UPDATE employees SET password_hash=NULL, is_active=0, first_login=1, pin=?, updated_at=datetime('now')
    WHERE matricule=?
  `).run(newPin, matricule.toUpperCase());

  res.json({ message: 'Mot de passe réinitialisé', pin: newPin });
};

// ── Payslip management (admin) ───────────────────────────────────────────────

const PDF_DIR = () => path.resolve(process.env.PDF_DIR || './pdf');

exports.getPayslips = (req, res) => {
  const { matricule } = req.params;
  const rows = db.prepare(
    'SELECT * FROM payslips WHERE matricule=? ORDER BY annee DESC, mois DESC'
  ).all(matricule.toUpperCase());
  res.json(rows);
};

exports.addPayslip = (req, res) => {
  const { matricule } = req.params;
  const { mois, annee, salaire_brut, salaire_net } = req.body;

  if (!mois || !annee || !salaire_brut || !salaire_net) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Mois, année, salaire brut et salaire net sont requis' });
  }

  const mat = matricule.toUpperCase();
  const emp = db.prepare('SELECT nom, prenom FROM employees WHERE matricule=?').get(mat);
  if (!emp) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ message: 'Employé introuvable' });
  }

  const fichier_pdf = `${mat}_${annee}_${mois}.pdf`;
  if (req.file) {
    const dir = PDF_DIR();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(req.file.path, path.join(dir, fichier_pdf));
  }

  try {
    db.prepare(`
      INSERT INTO payslips (matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(matricule, mois, annee) DO UPDATE SET
        salaire_brut=excluded.salaire_brut, salaire_net=excluded.salaire_net,
        fichier_pdf=excluded.fichier_pdf, synced_at=excluded.synced_at
    `).run(mat, emp.nom, emp.prenom, mois, parseInt(annee), parseFloat(salaire_brut), parseFloat(salaire_net), fichier_pdf);

    res.status(201).json({ message: 'Bulletin enregistré', fichier_pdf });
  } catch (e) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement", error: e.message });
  }
};

exports.updatePayslip = (req, res) => {
  const { id } = req.params;
  const { salaire_brut, salaire_net } = req.body;

  const payslip = db.prepare('SELECT * FROM payslips WHERE id=?').get(parseInt(id));
  if (!payslip) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ message: 'Bulletin introuvable' });
  }

  let { fichier_pdf } = payslip;
  if (req.file) {
    const dir = PDF_DIR();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(req.file.path, path.join(dir, fichier_pdf));
  }

  db.prepare(`
    UPDATE payslips SET
      salaire_brut=?, salaire_net=?, fichier_pdf=?, synced_at=datetime('now')
    WHERE id=?
  `).run(
    salaire_brut !== undefined ? parseFloat(salaire_brut) : payslip.salaire_brut,
    salaire_net !== undefined ? parseFloat(salaire_net) : payslip.salaire_net,
    fichier_pdf,
    parseInt(id)
  );

  res.json({ message: 'Bulletin mis à jour' });
};

exports.deletePayslip = (req, res) => {
  const { id } = req.params;
  const payslip = db.prepare('SELECT * FROM payslips WHERE id=?').get(parseInt(id));
  if (!payslip) return res.status(404).json({ message: 'Bulletin introuvable' });

  db.prepare('DELETE FROM payslips WHERE id=?').run(parseInt(id));

  const filePath = path.join(PDF_DIR(), payslip.fichier_pdf);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  res.json({ message: 'Bulletin supprimé' });
};
