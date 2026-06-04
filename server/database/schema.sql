-- Run this in the Supabase SQL editor before starting the server for the first time.
-- The server's initDB() will also auto-create these tables on startup,
-- but running this manually first is useful for pre-seeding or inspecting the schema.

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payslips (
  id SERIAL PRIMARY KEY,
  matricule TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  mois TEXT NOT NULL,
  annee INTEGER NOT NULL,
  salaire_brut DOUBLE PRECISION NOT NULL,
  salaire_net DOUBLE PRECISION NOT NULL,
  fichier_pdf TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matricule, mois, annee),
  FOREIGN KEY (matricule) REFERENCES employees(matricule)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  matricule TEXT NOT NULL,
  ip TEXT,
  success INTEGER DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payslips_matricule ON payslips(matricule);
CREATE INDEX IF NOT EXISTS idx_payslips_annee ON payslips(annee);
