// Netlify Function entrypoint for the Portail RH API.
//
// Wraps the Express app with serverless-http and exposes it as a single
// function. The netlify.toml redirect sends every /api/* request here. When a
// rewrite delivers the request under the raw function path, the request hook
// below restores the original /api/... path so the Express routes match.
const serverless = require('serverless-http');
const app = require('../lib/app');

const FUNCTION_PREFIX = '/.netlify/functions/api';

const handler = serverless(app, {
  request(req) {
    if (typeof req.url === 'string' && req.url.startsWith(FUNCTION_PREFIX)) {
      const rest = req.url.slice(FUNCTION_PREFIX.length);
      req.url = '/api' + (rest && rest !== '/' ? rest : '');
    }
  },
});

exports.handler = handler;
