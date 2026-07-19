#!/usr/bin/env node
// Stamps css/site.css with a content-hash query string across every HTML
// page, so a stale edge/browser cache can never serve old CSS under a URL
// that looks unchanged — the URL itself changes whenever the file does.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const css = readFileSync('css/site.css', 'utf8');
const hash = createHash('sha256').update(css).digest('hex').slice(0, 10);

const pages = ['index.html', 'birds/index.html', 'about/index.html', '404.html'];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const out = html.replace(
    /href="\/css\/site\.css(\?v=[^"]*)?"/,
    `href="/css/site.css?v=${hash}"`
  );
  if (out !== html) {
    writeFileSync(page, out);
    console.log(`${page} -> site.css?v=${hash}`);
  }
}
