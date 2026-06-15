const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../database/db');
const { sendPasswordResetEmail, sendNewDeviceAlert } = require('../utils/mailer');
const { generatePin } = require('../utils/generatePin');

function parseUserAgent(ua) {
  if (!ua) return 'Appareil inconnu';
  let device = 'Appareil inconnu';
  let browser = 'Navigateur inconnu';

  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android/.test(ua)) {
    const ver = ua.match(/Android [0-9.]+/)?.[0] || 'Android';
    device = /Mobile/.test(ua) ? `Téléphone (${ver})` : `Tablette (${ver})`;
  }
  else if (/Windows NT 10|Windows NT 11/.test(ua)) device = 'PC Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) device = 'PC Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) device = 'PC Windows 7';
  else if (/Macintosh|Mac OS X/.test(ua)) device = 'Mac';
  else if (/Linux/.test(ua)) device = 'Linux';

  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/YaBrowser/.test(ua)) browser = 'Yandex Browser';
  else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Version\//.test(ua) && /Safari\//.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer';

  return `${browser} sur ${device}`;
}

function deviceHash(ua) {
  return crypto.createHash('sha256').update(ua || '').digest('hex').substring(0, 40);
}

async function handleDeviceCheck(req, employee, alertOnNew = true) {
  try {
    const ua = req.headers['user-agent'] || '';
    const ip = req.ip || '';
    const hash = deviceHash(ua);
    const label = parseUserAgent(ua);

    const { rows } = await pool.query(
      'SELECT id FROM known_devices WHERE matricule=$1 AND device_hash=$2',
      [employee.matricule, hash]
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO known_devices (matricule, device_hash, user_agent, ip_address, device_label)
         VALUES ($1, $2, $3, $4, $5)`,
        [employee.matricule, hash, ua.substring(0, 500), ip, label]
      );
      if (alertOnNew && employee.email) {
        sendNewDeviceAlert(employee.email, employee.prenom, label, ip, new Date()).catch(() => {});
      }
    } else {
      await pool.query(
        `UPDATE known_devices SET last_seen_at=NOW(), ip_address=$1
         WHERE matricule=$2 AND device_hash=$3`,
        [ip, employee.matricule, hash]
      );
    }
  } catch {} // device tracking must never break login
}

async function recordAttempt(matricule, ip, success) {
  await pool.query(
    'INSERT INTO login_attempts (matricule, ip, success) VALUES ($1, $2, $3)',
    [matricule, ip, success ? 1 : 0]
  );
}

async function checkRateLimit(matricule) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { rows } = await pool.query(
    `SELECT COUNT(*) as cnt FROM login_attempts
     WHERE matricule=$1 AND success=0 AND attempted_at > $2`,
    [matricule, since]
  );
  return parseInt(rows[0].cnt) >= 5;
}

exports.login = async (req, res, next) => {
  try {
    const { matricule, password } = req.body;
    if (!matricule || !password)
      return res.status(400).json({ message: 'Matricule et mot de passe requis' });

    if (await checkRateLimit(matricule))
      return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans 15 minutes.' });

    const { rows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    const employee = rows[0];
    if (!employee) {
      await recordAttempt(matricule, req.ip, false);
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    if (employee.first_login) {
      if (password !== employee.pin) {
        await recordAttempt(matricule, req.ip, false);
        return res.status(401).json({ message: 'Code PIN incorrect' });
      }
      await recordAttempt(matricule, req.ip, true);
      const tempToken = jwt.sign(
        { matricule: employee.matricule, first_login: true },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      return res.json({ first_login: true, token: tempToken, message: 'Veuillez créer votre mot de passe' });
    }

    if (!employee.password_hash)
      return res.status(401).json({ message: 'Compte non activé' });

    const valid = bcrypt.compareSync(password, employee.password_hash);
    if (!valid) {
      await recordAttempt(matricule, req.ip, false);
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    if (!employee.is_active)
      return res.status(403).json({ message: 'Compte désactivé. Contactez les RH.' });

    await recordAttempt(matricule, req.ip, true);

    // Check for new device; alert employee if unrecognised (fire-and-forget)
    handleDeviceCheck(req, employee, true);

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
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { matricule, pin, new_password } = req.body;
    if (!matricule || !pin || !new_password)
      return res.status(400).json({ message: 'Champs requis manquants' });

    if (new_password.length < 8)
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });

    const { rows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    const employee = rows[0];
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    if (employee.pin !== pin) return res.status(401).json({ message: 'Code PIN invalide' });

    const hash = bcrypt.hashSync(new_password, 10);
    await pool.query(
      `UPDATE employees SET password_hash=$1, is_active=1, first_login=0, updated_at=NOW() WHERE matricule=$2`,
      [hash, matricule.toUpperCase()]
    );

    // Register this as a trusted device without alerting (it's the first login)
    handleDeviceCheck(req, employee, false);

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
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ message: 'Champs requis manquants' });

    if (new_password.length < 8)
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });

    const { rows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [req.user.matricule]);
    const employee = rows[0];
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });

    if (!employee.password_hash)
      return res.status(400).json({ message: 'Aucun mot de passe défini. Utilisez la procédure premier accès.' });

    const valid = bcrypt.compareSync(current_password, employee.password_hash);
    if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    const hash = bcrypt.hashSync(new_password, 10);
    await pool.query(
      `UPDATE employees SET password_hash=$1, updated_at=NOW() WHERE matricule=$2`,
      [hash, employee.matricule]
    );

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  const GENERIC_OK = { message: 'Si ces informations correspondent à un compte, un email a été envoyé.' };
  try {
    const { matricule, email } = req.body;
    if (!matricule || !email)
      return res.status(400).json({ message: 'Matricule et email requis' });

    const { rows } = await pool.query(
      'SELECT * FROM employees WHERE matricule=$1',
      [matricule.toUpperCase()]
    );
    const employee = rows[0];

    // Always return the same message to avoid user enumeration
    if (!employee || !employee.email || employee.email.toLowerCase() !== email.toLowerCase().trim())
      return res.json(GENERIC_OK);

    const newPin = generatePin();

    try {
      await sendPasswordResetEmail(employee.email, employee.prenom, newPin);
    } catch (mailErr) {
      return res.status(503).json({ message: 'Le service d\'email est temporairement indisponible. Veuillez réessayer plus tard ou contacter les RH.' });
    }

    await pool.query(
      `UPDATE employees SET password_hash=NULL, is_active=0, first_login=1, pin=$1, updated_at=NOW()
       WHERE matricule=$2`,
      [newPin, employee.matricule]
    );

    res.json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
};

exports.me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT matricule,nom,prenom,service,email,is_active FROM employees WHERE matricule=$1',
      [req.user.matricule]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Employé introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
