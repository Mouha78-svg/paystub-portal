const { pool } = require('../database/db');
const { sendVerificationEmail } = require('../utils/mailer');
const { generatePin } = require('../utils/generatePin');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const normalize = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

exports.register = async (req, res, next) => {
  try {
    const { matricule, nom, prenom, email, service } = req.body;

    if (!matricule || !nom || !prenom || !email || !service)
      return res.status(400).json({ message: 'Tous les champs sont requis' });

    const upper = matricule.toUpperCase();

    // Employee must already exist (pre-created by HR/admin via CSV)
    const { rows: empRows } = await pool.query(
      'SELECT * FROM employees WHERE matricule=$1',
      [upper]
    );
    const employee = empRows[0];

    if (!employee)
      return res.status(404).json({ message: 'Matricule introuvable. Vérifiez votre saisie ou contactez les RH.' });

    // Reject if account is already fully active
    if (employee.is_active && !employee.first_login)
      return res.status(409).json({ message: 'Ce compte est déjà activé. Connectez-vous directement.' });

    // Validate submitted details against the DB record
    if (normalize(nom) !== normalize(employee.nom))
      return res.status(400).json({ message: 'Le nom saisi ne correspond pas à nos enregistrements.' });

    if (normalize(prenom) !== normalize(employee.prenom))
      return res.status(400).json({ message: 'Le prénom saisi ne correspond pas à nos enregistrements.' });

    const dbService = normalize(employee.service);
    if (dbService && dbService !== 'non défini' && normalize(service) !== dbService)
      return res.status(400).json({ message: 'Le service saisi ne correspond pas à nos enregistrements.' });

    // Email must not already be claimed by a different account
    const { rows: emailConflict } = await pool.query(
      'SELECT matricule FROM employees WHERE email=$1 AND matricule!=$2',
      [email.toLowerCase().trim(), upper]
    );
    if (emailConflict.length > 0)
      return res.status(409).json({ message: 'Cet email est déjà utilisé par un autre compte.' });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO registration_requests (matricule, nom, prenom, service, email, genre, pin, verification_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8)
       ON CONFLICT (matricule) DO UPDATE SET
         email=$5, verification_code=$7, expires_at=$8, created_at=NOW()`,
      [upper, employee.nom, employee.prenom, employee.service, email.toLowerCase().trim(), employee.genre || 'M', code, expiresAt]
    );

    try {
      await sendVerificationEmail(email, employee.prenom, code);
    } catch (mailErr) {
      await pool.query('DELETE FROM registration_requests WHERE matricule=$1', [upper]);
      return res.status(503).json({ message: "Le service d'email est temporairement indisponible. Veuillez réessayer plus tard ou contacter les RH." });
    }

    res.json({ message: 'Code de vérification envoyé', email: email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    next(err);
  }
};

exports.verifyRegistration = async (req, res, next) => {
  try {
    const { matricule, code } = req.body;
    if (!matricule || !code)
      return res.status(400).json({ message: 'Matricule et code requis' });

    const upper = matricule.toUpperCase();
    const { rows } = await pool.query(
      'SELECT * FROM registration_requests WHERE matricule=$1',
      [upper]
    );
    const request = rows[0];

    if (!request)
      return res.status(404).json({ message: "Aucune demande d'inscription pour ce matricule" });

    if (new Date() > new Date(request.expires_at))
      return res.status(410).json({ message: "Code expiré. Veuillez recommencer l'inscription" });

    if (request.verification_code !== code)
      return res.status(401).json({ message: 'Code de vérification incorrect' });

    // Fetch the pre-existing employee to retrieve their PIN
    const { rows: empRows } = await pool.query(
      'SELECT * FROM employees WHERE matricule=$1',
      [upper]
    );
    const employee = empRows[0];

    if (!employee)
      return res.status(404).json({ message: 'Employé introuvable' });

    const newPin = generatePin();

    // Update email and assign a fresh random PIN — replaces any default PIN set at account creation
    await pool.query(
      'UPDATE employees SET email=$1, pin=$2, updated_at=NOW() WHERE matricule=$3',
      [request.email, newPin, upper]
    );

    await pool.query('DELETE FROM registration_requests WHERE matricule=$1', [upper]);

    res.json({
      message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
      matricule: upper,
      pin: newPin,
    });
  } catch (err) {
    next(err);
  }
};
