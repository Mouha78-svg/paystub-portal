// Postgres connection for the Netlify deployment.
//
// Netlify Database (managed Postgres) injects NETLIFY_DATABASE_URL into the
// function runtime automatically. We connect with the standard `pg` Pool so the
// existing controllers — which use pool.query() and pool.connect() for
// transactions — keep working unchanged. The pool is created lazily and reused
// across warm invocations.
const { Pool } = require('pg');

let _pool;
function getPool() {
  if (_pool) return _pool;
  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;
  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
  return _pool;
}

// Lazy proxy so `require`-time imports don't open a connection before the
// runtime env vars are available.
const pool = {
  query: (...args) => getPool().query(...args),
  connect: (...args) => getPool().connect(...args),
};

module.exports = { pool };
