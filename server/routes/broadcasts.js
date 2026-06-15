const router = require('express').Router();
const { pool } = require('../database/db');
const auth = require('../middleware/auth');

// Count unread broadcasts for current employee
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM broadcasts b
       WHERE NOT EXISTS (
         SELECT 1 FROM broadcast_reads br
         WHERE br.broadcast_id = b.id AND br.matricule = $1
       )`,
      [req.user.matricule]
    );
    res.json({ count: parseInt(rows[0].cnt) });
  } catch (err) { next(err); }
});

// List all broadcasts with read status for current employee
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.subject, b.body, b.created_at,
              e.nom AS sender_nom, e.prenom AS sender_prenom,
              br.read_at
       FROM broadcasts b
       JOIN employees e ON e.matricule = b.created_by
       LEFT JOIN broadcast_reads br ON br.broadcast_id = b.id AND br.matricule = $1
       ORDER BY b.created_at DESC`,
      [req.user.matricule]
    );
    res.json(rows.map(r => ({ ...r, is_read: r.read_at !== null })));
  } catch (err) { next(err); }
});

// Mark a broadcast as read
router.post('/:id/read', auth, async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO broadcast_reads (broadcast_id, matricule) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [parseInt(req.params.id), req.user.matricule]
    );
    res.json({ message: 'Lu' });
  } catch (err) { next(err); }
});

module.exports = router;
