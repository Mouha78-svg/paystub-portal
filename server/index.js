require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Init DB
initDB();

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { message: 'Trop de requêtes' } });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payslips', require('./routes/payslips'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Endpoint introuvable' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
