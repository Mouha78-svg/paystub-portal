const { pool } = require('../database/db');
const { sendVerificationEmail } = require('../utils/mailer');
const { generatePin } = require('../utils/generatePin');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.register = async (req, res, next) => {
  try {
    const { matricule, nom, prenom, email, service, genre } = req.body;

    if (!matricule || !nom || !prenom || !email || !service || !genre)
      return res.status(400).json({ message: 'Tous les champs sont requis' });

    const upper = matricule.toUpperCase();

    const { rows: existing } = await pool.query(
      'SELECT matricule FROM employees WHERE matricule=$1 OR email=$2',
      [upper, email.toLowerCase()]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: 'Un compte avec ce matricule ou cet email existe déjà' });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO registration_requests (matricule, nom, prenom, service, email, genre, pin, verification_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8)
       ON CONFLICT (matricule) DO UPDATE SET
         nom=$2, prenom=$3, service=$4, email=$5, genre=$6,
         pin='', verification_code=$7, expires_at=$8, created_at=NOW()`,
      [upper, nom.trim(), prenom.trim(), service.trim(), email.toLowerCase(), genre, code, expiresAt]
    );

    await sendVerificationEmail(email, prenom, code);

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
      return res.status(404).json({ message: 'Aucune demande d\'inscription pour ce matricule' });

    if (new Date() > new Date(request.expires_at))
      return res.status(410).json({ message: 'Code expiré. Veuillez recommencer l\'inscription' });

    if (request.verification_code !== code)
      return res.status(401).json({ message: 'Code de vérification incorrect' });

    const pin = generatePin();

    await pool.query(
      `INSERT INTO employees (matricule, nom, prenom, service, email, genre, pin, is_active, is_admin, first_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 1)`,
      [upper, request.nom, request.prenom, request.service, request.email, request.genre, pin]
    );

    await pool.query('DELETE FROM registration_requests WHERE matricule=$1', [upper]);

    res.json({ message: 'Compte créé avec succès', matricule: upper, pin });
  } catch (err) {
    next(err);
  }
};
