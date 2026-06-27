const { expand } = require('dotenv-expand');
expand(require('dotenv').config());
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Railway/proxy X-Forwarded-For headers (required for express-rate-limit)
app.set('trust proxy', 1);

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

// Serve PDF files (must be before API routes and rate limiter)
const pdfDir = path.resolve(process.env.PDF_DIR || './pdf');
app.use('/pdf', express.static(pdfDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payslips', require('./routes/payslips'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/broadcasts', require('./routes/broadcasts'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React build in production (local monolith only — skipped on Railway where client/dist doesn't exist)
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
  }
}

// 404
app.use((req, res) => res.status(404).json({ message: 'Endpoint introuvable' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur initialisation base de données:', err);
    process.exit(1);
  });
