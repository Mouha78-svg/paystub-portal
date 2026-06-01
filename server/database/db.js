const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/paystub.db';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

function initDB() {
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      service TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      pin TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      first_login INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      mois TEXT NOT NULL,
      annee INTEGER NOT NULL,
      salaire_brut REAL NOT NULL,
      salaire_net REAL NOT NULL,
      fichier_pdf TEXT,
      synced_at TEXT DEFAULT (datetime('now')),
      UNIQUE(matricule, mois, annee),
      FOREIGN KEY (matricule) REFERENCES employees(matricule)
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT NOT NULL,
      ip TEXT,
      success INTEGER DEFAULT 0,
      attempted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payslips_matricule ON payslips(matricule);
    CREATE INDEX IF NOT EXISTS idx_payslips_annee ON payslips(annee);
  `);

  // Migration: add is_admin column if it doesn't exist yet
  try { db.exec(`ALTER TABLE employees ADD COLUMN is_admin INTEGER DEFAULT 0`); } catch {}
  db.prepare(`UPDATE employees SET is_admin=1 WHERE matricule='EMP003'`).run();

  // Seed demo employees
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM employees').get();
  if (existing.cnt === 0) {
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const demoHash = bcrypt.hashSync('Admin123!', salt);
    const insertEmp = db.prepare(`
      INSERT INTO employees (matricule, nom, prenom, service, email, password_hash, pin, is_active, is_admin, first_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEmp.run('EMP001', 'Seye', 'Mouhamed', 'Informatique', 'mouhamed.seye@acme.sn', null, '1234', 0, 0, 1);
    insertEmp.run('EMP002', 'Diallo', 'Fatou', 'Ressources Humaines', 'fatou.diallo@acme.sn', null, '5678', 0, 0, 1);
    insertEmp.run('EMP003', 'Ndiaye', 'Ousmane', 'Finance', 'ousmane.ndiaye@acme.sn', demoHash, '9012', 1, 1, 0);
    console.log('✅ Données de démonstration insérées');
  }

  console.log('✅ Base de données initialisée');
}

module.exports = { db, initDB };
