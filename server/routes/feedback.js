const router = require('express').Router();
const { pool } = require('../database/db');
const auth = require('../middleware/auth');
const { sendMessageNotification } = require('../utils/mailer');

// Get full conversation thread for current employee
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.message, f.created_by, f.is_read, f.read_at, f.created_at,
              e.nom, e.prenom
       FROM feedback f
       JOIN employees e ON e.matricule = f.created_by
       WHERE f.matricule = $1
       ORDER BY f.created_at ASC`,
      [req.user.matricule]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Count unread admin replies for current employee
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM feedback
       WHERE matricule = $1 AND created_by != $1 AND is_read = false`,
      [req.user.matricule]
    );
    res.json({ count: parseInt(rows[0].cnt) });
  } catch (err) { next(err); }
});

// Send a message to administration
router.post('/', auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });
    const { rows } = await pool.query(
      `INSERT INTO feedback (matricule, message, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.matricule, message.trim(), req.user.matricule]
    );
    // Notify admins by email (fire-and-forget)
    pool.query(`SELECT email, prenom FROM employees WHERE is_admin = 1 AND email IS NOT NULL`)
      .then(({ rows: admins }) => {
        for (const a of admins) {
          sendMessageNotification(a.email, a.prenom, `${req.user.prenom} ${req.user.nom}`, message.trim())
            .catch(() => {});
        }
      }).catch(() => {});
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Mark all admin replies as read (called when employee opens conversation)
router.post('/mark-read', auth, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE feedback SET is_read = true, read_at = NOW()
       WHERE matricule = $1 AND created_by != $1 AND is_read = false`,
      [req.user.matricule]
    );
    res.json({ message: 'Messages marqués comme lus' });
  } catch (err) { next(err); }
});

// Edit own message
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });
    const { rows } = await pool.query(
      `UPDATE feedback SET message = $1 WHERE id = $2 AND created_by = $3 RETURNING *`,
      [message.trim(), parseInt(req.params.id), req.user.matricule]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message introuvable ou non autorisé' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Delete own message
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM feedback WHERE id = $1 AND created_by = $2 RETURNING id`,
      [parseInt(req.params.id), req.user.matricule]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message introuvable ou non autorisé' });
    res.json({ message: 'Message supprimé' });
  } catch (err) { next(err); }
});

module.exports = router;
