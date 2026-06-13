const { pool } = require('../database/db');
const path = require('path');
const fs = require('fs');
const { generatePin } = require('../utils/generatePin');

exports.getUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT matricule, nom, prenom, service, email, is_active, is_admin, first_login, created_at, updated_at
       FROM employees ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { matricule, nom, prenom, service, email, pin, is_admin = 0 } = req.body;
    if (!matricule || !nom || !prenom || !service)
      return res.status(400).json({ message: 'Matricule, nom, prénom et service requis' });

    const effectivePin = pin?.trim() || generatePin();

    await pool.query(
      `INSERT INTO employees (matricule, nom, prenom, service, email, pin, is_admin, is_active, first_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1)`,
      [matricule.toUpperCase(), nom.trim(), prenom.trim(), service.trim(), email?.trim() || null, effectivePin, is_admin ? 1 : 0]
    );

    res.status(201).json({ message: 'Employé créé', matricule: matricule.toUpperCase(), pin: effectivePin });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Ce matricule existe déjà' });
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { matricule } = req.params;
    const { nom, prenom, service, email, is_admin, is_active } = req.body;

    const { rows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    const emp = rows[0];
    if (!emp) return res.status(404).json({ message: 'Employé introuvable' });

    await pool.query(
      `UPDATE employees SET nom=$1, prenom=$2, service=$3, email=$4, is_admin=$5, is_active=$6, updated_at=NOW()
       WHERE matricule=$7`,
      [
        nom !== undefined ? nom.trim() : emp.nom,
        prenom !== undefined ? prenom.trim() : emp.prenom,
        service !== undefined ? service.trim() : emp.service,
        email !== undefined ? (email.trim() || null) : emp.email,
        is_admin !== undefined ? (is_admin ? 1 : 0) : emp.is_admin,
        is_active !== undefined ? (is_active ? 1 : 0) : emp.is_active,
        matricule.toUpperCase(),
      ]
    );

    res.json({ message: 'Employé mis à jour' });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  const { matricule } = req.params;
  if (matricule.toUpperCase() === req.user.matricule)
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query('SELECT 1 FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Employé introuvable' });
    }
    await client.query('DELETE FROM payslips WHERE matricule=$1', [matricule.toUpperCase()]);
    await client.query('DELETE FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    await client.query('COMMIT');
    res.json({ message: 'Employé supprimé' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { matricule } = req.params;
    const { pin } = req.body;

    const { rows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [matricule.toUpperCase()]);
    if (!rows[0]) return res.status(404).json({ message: 'Employé introuvable' });

    const newPin = pin?.trim() || generatePin();

    await pool.query(
      `UPDATE employees SET password_hash=NULL, is_active=0, first_login=1, pin=$1, updated_at=NOW()
       WHERE matricule=$2`,
      [newPin, matricule.toUpperCase()]
    );

    res.json({ message: 'Mot de passe réinitialisé', pin: newPin });
  } catch (err) {
    next(err);
  }
};

// ── Feedback management (admin) ──────────────────────────────────────────────

exports.getAllUserFeedback = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.matricule, f.message, f.created_at,
             e.nom, e.prenom, e.service
      FROM feedback f
      JOIN employees e ON e.matricule = f.matricule
      WHERE f.created_by = f.matricule
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM feedback WHERE matricule=$1 ORDER BY created_at DESC',
      [req.params.matricule.toUpperCase()]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.addFeedback = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });
    const { rows } = await pool.query(
      `INSERT INTO feedback (matricule, message, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.matricule.toUpperCase(), message.trim(), req.user.matricule]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteFeedback = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM feedback WHERE id=$1 RETURNING id',
      [parseInt(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message introuvable' });
    res.json({ message: 'Message supprimé' });
  } catch (err) { next(err); }
};

// ── Payslip management (admin) ───────────────────────────────────────────────

const PDF_DIR = () => path.resolve(process.env.PDF_DIR || './pdf');

exports.getPayslips = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM payslips WHERE matricule=$1 ORDER BY annee DESC, mois DESC',
      [req.params.matricule.toUpperCase()]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.addPayslip = async (req, res, next) => {
  try {
    const { matricule } = req.params;
    const { mois, annee, numero, salaire_brut, salaire_net } = req.body;

    if (!mois || !annee || !salaire_brut || !salaire_net) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Mois, année, salaire brut et salaire net sont requis' });
    }

    const num = parseInt(numero) || 1;
    if (num < 1 || num > 2) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Le numéro de bulletin doit être 1 ou 2' });
    }

    const mat = matricule.toUpperCase();
    const { rows } = await pool.query('SELECT nom, prenom FROM employees WHERE matricule=$1', [mat]);
    const emp = rows[0];
    if (!emp) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Employé introuvable' });
    }

    const fichier_pdf = `${mat}_${annee}_${mois}_${num}.pdf`;
    if (req.file) {
      const dir = PDF_DIR();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(req.file.path, path.join(dir, fichier_pdf));
    }

    await pool.query(
      `INSERT INTO payslips (matricule, nom, prenom, mois, annee, numero, salaire_brut, salaire_net, fichier_pdf, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT(matricule, mois, annee, numero) DO UPDATE SET
         salaire_brut=EXCLUDED.salaire_brut, salaire_net=EXCLUDED.salaire_net,
         fichier_pdf=EXCLUDED.fichier_pdf, synced_at=NOW()`,
      [mat, emp.nom, emp.prenom, mois, parseInt(annee), num, parseFloat(salaire_brut), parseFloat(salaire_net), fichier_pdf]
    );

    res.status(201).json({ message: 'Bulletin enregistré', fichier_pdf });
  } catch (err) {
    next(err);
  }
};

exports.updatePayslip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { salaire_brut, salaire_net } = req.body;

    const { rows } = await pool.query('SELECT * FROM payslips WHERE id=$1', [parseInt(id)]);
    const payslip = rows[0];
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

    await pool.query(
      `UPDATE payslips SET salaire_brut=$1, salaire_net=$2, fichier_pdf=$3, synced_at=NOW() WHERE id=$4`,
      [
        salaire_brut !== undefined ? parseFloat(salaire_brut) : payslip.salaire_brut,
        salaire_net !== undefined ? parseFloat(salaire_net) : payslip.salaire_net,
        fichier_pdf,
        parseInt(id),
      ]
    );

    res.json({ message: 'Bulletin mis à jour' });
  } catch (err) {
    next(err);
  }
};

exports.deletePayslip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM payslips WHERE id=$1', [parseInt(id)]);
    const payslip = rows[0];
    if (!payslip) return res.status(404).json({ message: 'Bulletin introuvable' });

    await pool.query('DELETE FROM payslips WHERE id=$1', [parseInt(id)]);

    const filePath = path.join(PDF_DIR(), payslip.fichier_pdf);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    res.json({ message: 'Bulletin supprimé' });
  } catch (err) {
    next(err);
  }
};
