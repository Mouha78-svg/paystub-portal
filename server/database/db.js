const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      matricule TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      service TEXT NOT NULL,
      email TEXT,
      genre TEXT,
      password_hash TEXT,
      pin TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      first_login INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add genre column to existing tables that predate the column
  await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS genre TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payslips (
      id SERIAL PRIMARY KEY,
      matricule TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      mois TEXT NOT NULL,
      annee INTEGER NOT NULL,
      numero INTEGER NOT NULL DEFAULT 1,
      salaire_brut DOUBLE PRECISION NOT NULL,
      salaire_net DOUBLE PRECISION NOT NULL,
      fichier_pdf TEXT,
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(matricule, mois, annee, numero),
      CHECK (numero BETWEEN 1 AND 2),
      FOREIGN KEY (matricule) REFERENCES employees(matricule)
    )
  `);

  // Migrate existing tables: add numero, swap unique constraint, add check constraint
  await pool.query(`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS numero INTEGER NOT NULL DEFAULT 1`);
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payslips_matricule_mois_annee_key'
      ) THEN
        ALTER TABLE payslips DROP CONSTRAINT payslips_matricule_mois_annee_key;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payslips_matricule_mois_annee_numero_key'
      ) THEN
        ALTER TABLE payslips ADD CONSTRAINT payslips_matricule_mois_annee_numero_key
          UNIQUE (matricule, mois, annee, numero);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payslips_numero_check'
      ) THEN
        ALTER TABLE payslips ADD CONSTRAINT payslips_numero_check
          CHECK (numero BETWEEN 1 AND 2);
      END IF;
    END $$
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      matricule TEXT NOT NULL,
      ip TEXT,
      success INTEGER DEFAULT 0,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_requests (
      id SERIAL PRIMARY KEY,
      matricule TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      service TEXT NOT NULL,
      email TEXT NOT NULL,
      genre TEXT NOT NULL,
      pin TEXT NOT NULL DEFAULT '',
      verification_code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(matricule),
      UNIQUE(email)
    )
  `);

  await pool.query(`ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS pin TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      matricule TEXT NOT NULL REFERENCES employees(matricule) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_by TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES employees(matricule),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS broadcast_reads (
      broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
      matricule TEXT NOT NULL REFERENCES employees(matricule) ON DELETE CASCADE,
      read_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (broadcast_id, matricule)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS known_devices (
      id SERIAL PRIMARY KEY,
      matricule TEXT NOT NULL REFERENCES employees(matricule) ON DELETE CASCADE,
      device_hash TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      ip_address TEXT,
      device_label TEXT,
      first_seen_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(matricule, device_hash)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_known_devices_matricule ON known_devices(matricule)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_matricule ON feedback(matricule)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_broadcast_reads_matricule ON broadcast_reads(matricule)`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_matricule ON payslips(matricule)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_annee ON payslips(annee)`);

  await pool.query(`UPDATE employees SET is_admin=1 WHERE matricule='EMP003'`);

  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM employees');
  if (parseInt(rows[0].cnt) === 0) {
    const bcrypt = require('bcryptjs');
    const { generatePin } = require('../utils/generatePin');
    const demoHash = bcrypt.hashSync('Admin123!', 10);
    const pin1 = generatePin();
    const pin2 = generatePin();
    const pin3 = generatePin();
    await pool.query(
      `INSERT INTO employees (matricule, nom, prenom, service, email, password_hash, pin, is_active, is_admin, first_login)
       VALUES
         ('EMP001','Seye','Mouhamed','Informatique','mouhamed.seye@acme.sn',NULL,$1,0,0,1),
         ('EMP002','Diallo','Fatou','Ressources Humaines','fatou.diallo@acme.sn',NULL,$2,0,0,1),
         ('EMP003','Ndiaye','Ousmane','Finance','ousmane.ndiaye@acme.sn',$3,$4,1,1,0)`,
      [pin1, pin2, demoHash, pin3]
    );
    console.log('✅ Données de démonstration insérées');
    console.log(`   EMP001 PIN: ${pin1}`);
    console.log(`   EMP002 PIN: ${pin2}`);
    console.log(`   EMP003 mot de passe: Admin123!`);
  }

  console.log('✅ Base de données initialisée');
}

module.exports = { pool, initDB };
