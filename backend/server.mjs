// Small web server. The API keys stay here and never reach the browser.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UserError, generateIdeas, listProviders, validateRequest } from './ideas.mjs';

const FRONTEND_DIR = join(import.meta.dirname, '..', 'frontend');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 4096;

// Only these files are served, so .env can never be requested.
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new UserError(413, 'Forespørselen er for stor.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new UserError(400, 'Forespørselen kunne ikke leses.');
  }
}

async function handleIdeas(req, res) {
  // Requiring JSON makes browsers block cross-site posts to this local server.
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new UserError(415, 'Forespørselen må være JSON.');
  }
  const body = await readJsonBody(req);
  const request = validateRequest(body);
  sendJson(res, 200, await generateIdeas({ providerId: body.provider, request, env: process.env }));
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && pathname === '/api/ideas') return await handleIdeas(req, res);
    if (req.method === 'GET' && pathname === '/api/config') {
      return sendJson(res, 200, { providers: listProviders(process.env) });
    }
    const file = STATIC_FILES[pathname];
    if (req.method === 'GET' && file) {
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
      return res.end(await readFile(join(FRONTEND_DIR, file[0])));
    }
    sendJson(res, 404, { error: 'Fant ikke siden.' });
  } catch (error) {
    if (error instanceof UserError) return sendJson(res, error.status, { error: error.message });
    console.error(error);
    sendJson(res, 500, { error: 'Noe gikk galt på serveren. Prøv igjen.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Idéverksted kjører på http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`);
});
