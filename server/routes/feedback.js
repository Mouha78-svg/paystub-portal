const router = require('express').Router();
const { pool } = require('../database/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, message, created_by, created_at FROM feedback WHERE matricule=$1 ORDER BY created_at ASC',
      [req.user.matricule]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });
    const { rows } = await pool.query(
      `INSERT INTO feedback (matricule, message, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.matricule, message.trim(), req.user.matricule]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });
    const { rows } = await pool.query(
      `UPDATE feedback SET message=$1 WHERE id=$2 AND created_by=$3 RETURNING *`,
      [message.trim(), parseInt(req.params.id), req.user.matricule]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message introuvable ou non autorisé' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM feedback WHERE id=$1 AND created_by=$2 RETURNING id`,
      [parseInt(req.params.id), req.user.matricule]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message introuvable ou non autorisé' });
    res.json({ message: 'Message supprimé' });
  } catch (err) { next(err); }
});

module.exports = router;
