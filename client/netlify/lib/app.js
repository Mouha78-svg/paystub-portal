// Express application for the Portail RH API, packaged to run inside a single
// Netlify Function (see ../functions/api.js). It mounts the same routes as the
// original standalone server but omits server-bootstrap concerns (app.listen,
// static file serving, runtime DB init) which Netlify handles instead.
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// Per-process rate limiter. In a serverless context this is best-effort; the
// durable per-matricule login throttle lives in the database (login_attempts).
// Proxy/IP validation is disabled — requests always arrive via Netlify's proxy.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Trop de requêtes' },
  validate: false,
});

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/payslips', require('./routes/payslips'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ message: 'Endpoint introuvable' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

module.exports = app;
