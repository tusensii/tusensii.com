#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { renderBird, renderSection, loadCatalog } from './render-plate.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const PORT = 4790;

// This server can rewrite site data and run a production deploy, so it must
// only answer the admin UI it serves. Checking Host defeats DNS rebinding;
// requiring a same-origin Origin plus a JSON content type on writes defeats
// cross-site form/fetch posts (text/plain "simple requests" skip CORS).
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([...ALLOWED_HOSTS].map((h) => `http://${h}`));
const MAX_BODY_BYTES = 25 * 1024 * 1024; // image uploads arrive as base64 JSON

// Only the admin UI and the public site's own assets are served; dotfiles
// (.git, .wrangler, .claude) and scripts/docs never are.
const STATIC_DIRS = ['/admin/', '/css/', '/images/', '/data/', '/birds/', '/about/'];
const STATIC_FILES = new Set(['/index.html', '/404.html', '/favicon.svg', '/apple-touch-icon.png']);

function isAllowedStaticPath(urlPath) {
  if (urlPath.split('/').some((seg) => seg.startsWith('.'))) return false;
  return STATIC_FILES.has(urlPath) || STATIC_DIRS.some((dir) => urlPath.startsWith(dir));
}

function rejectRequest(req) {
  if (!ALLOWED_HOSTS.has(req.headers.host || '')) return 'bad host';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!ALLOWED_ORIGINS.has(req.headers.origin || '')) return 'bad origin';
    const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') return 'bad content type';
  }
  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
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
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }
  if (urlPath === '/') urlPath = '/admin/index.html';
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (!isAllowedStaticPath(safePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const filePath = join(ROOT, safePath);
  if (!filePath.startsWith(ROOT + '/') || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

async function runStep(name, command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: ROOT });
    return { name, ok: true, output: stdout + stderr };
  } catch (err) {
    return { name, ok: false, output: (err.stdout || '') + (err.stderr || '') + '\n' + err.message };
  }
}

const server = createServer(async (req, res) => {
  const rejection = rejectRequest(req);
  if (rejection) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end(`Forbidden: ${rejection}`);
    return;
  }
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
  if (req.method === 'POST' && req.url === '/api/deploy') {
    const steps = [
      ['build-plates', 'node', ['scripts/build-plates.mjs']],
      ['version-assets', 'node', ['scripts/version-assets.mjs']],
      ['wrangler-deploy', 'node', ['scripts/deploy.mjs']],
    ];
    let combinedOutput = '';
    for (const [name, command, args] of steps) {
      const result = await runStep(name, command, args);
      combinedOutput += `\n--- ${name} ---\n${result.output}\n`;
      if (!result.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, output: combinedOutput, failedAt: name }));
        return;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, output: combinedOutput }));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/render') {
    try {
      const body = JSON.parse(await readBody(req));
      const catalog = loadCatalog();
      const html = body.item.type === 'section'
        ? renderSection(body.item)
        : renderBird(body.item, body.plateNumber || 'I', catalog);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, html }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }
  if (req.method === 'POST' && req.url === '/api/upload-image') {
    try {
      const body = JSON.parse(await readBody(req));
      const ext = (extname(body.filename || '') || '.jpg').toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        throw new Error(`Unsupported image type: ${ext}`);
      }
      const base = slugify(body.species || body.filename || 'bird');
      if (!base) throw new Error('Could not derive a safe filename');
      const targetDir = join(ROOT, 'images/plates');
      mkdirSync(targetDir, { recursive: true });
      const targetPath = join(targetDir, base + ext);
      if (!targetPath.startsWith(targetDir)) throw new Error('Invalid path');
      writeFileSync(targetPath, Buffer.from(body.dataBase64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: `/images/plates/${base}${ext}` }));
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
