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
      password_hash TEXT,
      pin TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      first_login INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
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
    )
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

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_matricule ON payslips(matricule)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_annee ON payslips(annee)`);

  await pool.query(`UPDATE employees SET is_admin=1 WHERE matricule='EMP003'`);

  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM employees');
  if (parseInt(rows[0].cnt) === 0) {
    const bcrypt = require('bcryptjs');
    const demoHash = bcrypt.hashSync('Admin123!', 10);
    const DEFAULT_PIN = 'Crous2025';
    await pool.query(
      `INSERT INTO employees (matricule, nom, prenom, service, email, password_hash, pin, is_active, is_admin, first_login)
       VALUES
         ('EMP001','Seye','Mouhamed','Informatique','mouhamed.seye@acme.sn',NULL,$1,0,0,1),
         ('EMP002','Diallo','Fatou','Ressources Humaines','fatou.diallo@acme.sn',NULL,$1,0,0,1),
         ('EMP003','Ndiaye','Ousmane','Finance','ousmane.ndiaye@acme.sn',$2,$1,1,1,0)`,
      [DEFAULT_PIN, demoHash]
    );
    console.log('✅ Données de démonstration insérées');
  } else {
    await pool.query(
      `UPDATE employees SET pin=$1 WHERE matricule IN ('EMP001','EMP002') AND first_login=1`,
      ['Crous2025']
    );
  }

  console.log('✅ Base de données initialisée');
}

module.exports = { pool, initDB };
