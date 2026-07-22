#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 4790;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function writeJson(relPath, value) {
  writeFileSync(join(ROOT, relPath), JSON.stringify(value, null, 2) + '\n');
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/admin/index.html';
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, safePath);
  if (!filePath.startsWith(ROOT) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/data') {
    const items = readJson('data/plates.json');
    const catalog = readJson('data/fact-catalog.json');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items, catalog }));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/save') {
    try {
      const body = JSON.parse(await readBody(req));
      writeJson('data/plates.json', body.items);
      writeJson('data/fact-catalog.json', body.catalog);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin UI: http://127.0.0.1:${PORT}/`);
});
