const { db } = require('../database/db');

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

  const effectivePin = pin?.trim() || Math.floor(1000 + Math.random() * 9000).toString();

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

  const newPin = pin?.trim() || Math.floor(1000 + Math.random() * 9000).toString();

  db.prepare(`
    UPDATE employees SET password_hash=NULL, is_active=0, first_login=1, pin=?, updated_at=datetime('now')
    WHERE matricule=?
  `).run(newPin, matricule.toUpperCase());

  res.json({ message: 'Mot de passe réinitialisé', pin: newPin });
};
