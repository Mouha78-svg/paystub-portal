-- Portail RH — initial schema and demo seed.
-- Mirrors the tables previously created at runtime by the standalone Express
-- server (employees, payslips, login_attempts) so the Netlify deployment has a
-- ready-to-use database. Applied automatically by Netlify on deploy.

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

-- Demo accounts (matches the documented demo credentials).
--   EMP001 / EMP002 : first-login, default PIN "Crous2025"
--   EMP003          : active admin, password "Admin123!"
INSERT INTO employees (matricule, nom, prenom, service, email, password_hash, pin, is_active, is_admin, first_login)
VALUES
  ('EMP001','Seye','Mouhamed','Informatique','mouhamed.seye@acme.sn',NULL,'Crous2025',0,0,1),
  ('EMP002','Diallo','Fatou','Ressources Humaines','fatou.diallo@acme.sn',NULL,'Crous2025',0,0,1),
  ('EMP003','Ndiaye','Ousmane','Finance','ousmane.ndiaye@acme.sn','$2a$10$M11pSF1YR2MvCMEl8yiUdutg3/5VtPAelQDZTVyMVerElgLmLScrm','Crous2025',1,1,0)
ON CONFLICT (matricule) DO NOTHING;

-- A few sample payslips so the portal shows real data on first load.
INSERT INTO payslips (matricule, nom, prenom, mois, annee, salaire_brut, salaire_net, fichier_pdf)
VALUES
  ('EMP001','Seye','Mouhamed','Janvier',2025,500000,420000,'EMP001_2025_Janvier.pdf'),
  ('EMP001','Seye','Mouhamed','Février',2025,500000,420000,'EMP001_2025_Février.pdf'),
  ('EMP002','Diallo','Fatou','Janvier',2025,650000,545000,'EMP002_2025_Janvier.pdf'),
  ('EMP003','Ndiaye','Ousmane','Janvier',2025,800000,665000,'EMP003_2025_Janvier.pdf')
ON CONFLICT (matricule, mois, annee) DO NOTHING;
