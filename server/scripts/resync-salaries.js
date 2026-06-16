/**
 * One-time repair script: re-extracts salaire_brut / salaire_net from PDF files
 * for any payslip rows that have 0 (or NULL) for either salary field.
 *
 * Usage: node scripts/resync-salaries.js [--dry-run]
 *
 * Reads server/.env for DATABASE_URL and PDF_DIR.
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const dotenv = require('dotenv');
require('dotenv-expand').expand(dotenv.config({ path: path.join(__dirname, '..', '.env') }));

const { Pool } = require('pg');
const pdfParse = require('pdf-parse');

const DRY_RUN = process.argv.includes('--dry-run');
const PDF_DIR = path.resolve(__dirname, '..', process.env.PDF_DIR || './pdf');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Amount helpers ───────────────────────────────────────────────────────────

function parseAmount(str) {
  if (!str) return 0;
  const v = parseFloat(str.trim().replace(/[\s ]/g, '').replace(',', '.'));
  return isNaN(v) || v < 0 ? 0 : v;
}

function parseSalaries(text) {
  const t = text.replace(/\s+/g, ' ');
  let salaire_brut = 0;
  let salaire_net  = 0;

  // AMT matches either:
  //   • French space-separated integer: "617 524", "1 026 976"  (\d{1,3}(?:[\s ]\d{3})+)
  //   • Plain integer 4-10 digits:      "376132"                (\d{4,10})
  // Using [^\d]+ before AMT lets us skip any non-digit junk between the label
  // and the amount (underscores, asterisks, "CFA", etc.).
  const AMT = '(\\d{1,3}(?:[\\s ]\\d{3})+|\\d{4,10})';

  const brutPatterns = [
    // "Total Brut" is the summary row — most reliable target
    new RegExp('Total\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Traitement\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Montant\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Salaire\\s+Brut[^\\d]+' + AMT, 'i'),
    new RegExp('Brut\\s+Imposable[^\\d]+' + AMT, 'i'),
  ];
  for (const p of brutPatterns) {
    const m = t.match(p);
    if (m) {
      const val = parseAmount(m[1]);
      // Skip implausibly small matches (row numbers, hours, etc.)
      if (val > 10000) { salaire_brut = val; break; }
    }
  }

  const netPatterns = [
    // "NET A PAYER *** 617 524"  or  "Net à payer 420 000"
    new RegExp('Net\\s+[\\u00e0a]\\s+[Pp]ayer[^\\d]+' + AMT, 'i'),
    new RegExp('Net\\s+Pay[e\\u00e9][^\\d]+' + AMT, 'i'),
    new RegExp('Net\\s+Fiscal[^\\d]+' + AMT, 'i'),
    new RegExp('Montant\\s+Net[^\\d]+' + AMT, 'i'),
  ];
  for (const p of netPatterns) {
    const m = t.match(p);
    if (m) {
      const val = parseAmount(m[1]);
      if (val > 10000) { salaire_net = val; break; }
    }
  }

  return { salaire_brut, salaire_net };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`PDF_DIR : ${PDF_DIR}`);
  console.log(`DRY_RUN : ${DRY_RUN}`);
  console.log('');

  const { rows } = await pool.query(`
    SELECT id, matricule, mois, annee, numero, fichier_pdf, salaire_brut, salaire_net
    FROM payslips
    WHERE (salaire_brut IS NULL OR salaire_brut = 0
           OR salaire_net  IS NULL OR salaire_net  = 0)
      AND fichier_pdf IS NOT NULL
    ORDER BY matricule, annee, mois, numero
  `);

  console.log(`Found ${rows.length} payslip(s) with missing salary data.\n`);
  if (rows.length === 0) { await pool.end(); return; }

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const row of rows) {
    const pdfPath = path.join(PDF_DIR, row.fichier_pdf);

    if (!fs.existsSync(pdfPath)) {
      console.warn(`  SKIP  [${row.id}] ${row.fichier_pdf} — file not found on disk`);
      skipped++;
      continue;
    }

    let salaire_brut = 0;
    let salaire_net  = 0;

    try {
      const buffer = fs.readFileSync(pdfPath);
      const pageTexts = [];
      await pdfParse(buffer, {
        pagerender: (pageData) =>
          pageData.getTextContent({ normalizeWhitespace: true }).then(tc => {
            const text = tc.items.map(i => i.str).join(' ');
            pageTexts.push(text);
            return text;
          }),
      });
      const fullText = pageTexts.join(' ');
      ({ salaire_brut, salaire_net } = parseSalaries(fullText));
    } catch (err) {
      console.error(`  ERROR [${row.id}] ${row.fichier_pdf} — ${err.message}`);
      failed++;
      continue;
    }

    const brutOk = salaire_brut > 0;
    const netOk  = salaire_net  > 0;

    if (!brutOk && !netOk) {
      console.warn(`  SKIP  [${row.id}] ${row.fichier_pdf} — could not extract amounts from PDF text`);
      skipped++;
      continue;
    }

    const newBrut = (brutOk && (row.salaire_brut == null || row.salaire_brut === 0))
      ? salaire_brut : row.salaire_brut;
    const newNet  = (netOk  && (row.salaire_net  == null || row.salaire_net  === 0))
      ? salaire_net  : row.salaire_net;

    console.log(
      `  UPDATE [${row.id}] ${row.fichier_pdf.padEnd(30)}` +
      `  brut: ${String(row.salaire_brut).padStart(10)} → ${String(newBrut).padStart(10)}` +
      `  net: ${String(row.salaire_net).padStart(10)} → ${String(newNet).padStart(10)}`
    );

    if (!DRY_RUN) {
      await pool.query(
        'UPDATE payslips SET salaire_brut=$1, salaire_net=$2 WHERE id=$3',
        [newBrut, newNet, row.id]
      );
    }
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}  Errors: ${failed}`);
  if (DRY_RUN) console.log('(dry-run — no rows were changed)');

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
