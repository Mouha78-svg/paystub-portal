// Storage for admin-uploaded payslip PDFs using Netlify Blobs.
//
// Serverless functions have no persistent local disk, so uploaded files are
// kept in a Netlify Blobs store keyed by their `fichier_pdf` filename. The
// download endpoint reads them back from here; when no uploaded file exists it
// falls back to generating an HTML bulletin on the fly.
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'payslip-pdfs';

function store() {
  return getStore(STORE_NAME);
}

async function savePdf(name, buffer) {
  await store().set(name, buffer);
}

// Returns a Buffer when the PDF exists, otherwise null.
async function getPdf(name) {
  const data = await store().get(name, { type: 'arrayBuffer' });
  if (!data) return null;
  return Buffer.from(data);
}

async function deletePdf(name) {
  try {
    await store().delete(name);
  } catch {
    /* ignore missing blobs */
  }
}

module.exports = { savePdf, getPdf, deletePdf };
