const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

function recordAttempt(matricule, ip, success) {
  db.prepare('INSERT INTO login_attempts (matricule, ip, success) VALUES (?, ?, ?)').run(matricule, ip, success ? 1 : 0);
}

function checkRateLimit(matricule) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM login_attempts
    WHERE matricule=? AND success=0 AND attempted_at > ?
  `).get(matricule, since);
  return row.cnt >= 5;
}

exports.login = (req, res) => {
  const { matricule, password } = req.body;
  if (!matricule || !password)
    return res.status(400).json({ message: 'Matricule et mot de passe requis' });

  if (checkRateLimit(matricule)) {
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }

  const employee = db.prepare('SELECT * FROM employees WHERE matricule=?').get(matricule.toUpperCase());
  if (!employee) {
    recordAttempt(matricule, req.ip, false);
    return res.status(401).json({ message: 'Identifiants incorrects' });
  }

  // First login: verify by PIN
  if (employee.first_login) {
    if (password !== employee.pin) {
      recordAttempt(matricule, req.ip, false);
      return res.status(401).json({ message: 'Code PIN incorrect' });
    }
    recordAttempt(matricule, req.ip, true);
    const tempToken = jwt.sign(
      { matricule: employee.matricule, first_login: true },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
    return res.json({ first_login: true, token: tempToken, message: 'Veuillez créer votre mot de passe' });
  }

  // Normal login
  if (!employee.password_hash) {
    return res.status(401).json({ message: 'Compte non activé' });
  }

  const valid = bcrypt.compareSync(password, employee.password_hash);
  if (!valid) {
    recordAttempt(matricule, req.ip, false);
    return res.status(401).json({ message: 'Identifiants incorrects' });
  }

  if (!employee.is_active) {
    return res.status(403).json({ message: 'Compte désactivé. Contactez les RH.' });
  }

  recordAttempt(matricule, req.ip, true);
  const token = jwt.sign(
    { matricule: employee.matricule, nom: employee.nom, prenom: employee.prenom, service: employee.service, is_admin: employee.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    employee: {
      matricule: employee.matricule,
      nom: employee.nom,
      prenom: employee.prenom,
      service: employee.service,
      email: employee.email,
      is_admin: employee.is_admin,
    }
  });
};

exports.changePassword = (req, res) => {
  const { matricule, pin, new_password } = req.body;
  if (!matricule || !pin || !new_password)
    return res.status(400).json({ message: 'Champs requis manquants' });

  if (new_password.length < 8)
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });

  const employee = db.prepare('SELECT * FROM employees WHERE matricule=?').get(matricule.toUpperCase());
  if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
  if (employee.pin !== pin) return res.status(401).json({ message: 'Code PIN invalide' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare(`
    UPDATE employees SET password_hash=?, is_active=1, first_login=0, updated_at=datetime('now')
    WHERE matricule=?
  `).run(hash, matricule.toUpperCase());

  const token = jwt.sign(
    { matricule: employee.matricule, nom: employee.nom, prenom: employee.prenom, service: employee.service, is_admin: employee.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    message: 'Mot de passe défini avec succès',
    token,
    employee: { matricule: employee.matricule, nom: employee.nom, prenom: employee.prenom, service: employee.service, is_admin: employee.is_admin }
  });
};

exports.logout = (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
};

exports.me = (req, res) => {
  const emp = db.prepare('SELECT matricule,nom,prenom,service,email,is_active FROM employees WHERE matricule=?').get(req.user.matricule);
  if (!emp) return res.status(404).json({ message: 'Employé introuvable' });
  res.json(emp);
};
