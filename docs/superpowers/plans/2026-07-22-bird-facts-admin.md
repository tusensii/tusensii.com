# Bird Plates — Facts, Sections & Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed locality/season/behavior fields on bird plates with a customizable per-bird facts list, add green section-header dividers, and build a local-only admin UI (list/reorder/edit/upload/Save/Deploy) for managing `data/plates.json`.

**Architecture:** `data/plates.json` becomes one ordered array of `{type:"bird",...}` and `{type:"section",...}` items. A new shared module `scripts/render-plate.mjs` turns one item into HTML; both `scripts/build-plates.mjs` and a new local admin server (`scripts/admin-server.mjs`, zero dependencies, plain `node:http`) import it, so the admin UI's live preview can never drift from the deployed output. The admin frontend (`admin/index.html` + `admin/app.js` + `admin/style.css`) is vanilla JS/HTML served by the admin server, which also serves the whole repo statically (read-only, for `/css/site.css` and `/images/plates/*` previewing) and exposes a small JSON API for read/save/upload/render/deploy.

**Tech Stack:** Plain Node.js (v24, using built-in `node:test` for tests, `node:http` for the server — no new npm dependencies, no `package.json` needed).

## Global Constraints

- No new npm dependencies — everything uses Node built-ins (`node:http`, `node:fs`, `node:path`, `node:crypto`, `node:child_process`, `node:test`, `node:assert`).
- Admin server binds to `127.0.0.1` only, no authentication.
- `species.replace(' ', '<br>')` (first-space-only line break) must be preserved exactly.
- Plate numbering is roman numerals I–X (falling back to `i+1` beyond X), continuous across the whole sequence, incrementing only on `type:"bird"` items (section items are skipped).
- Section dividers reuse the existing `.band` CSS class in `css/site.css` — no new CSS class for the divider itself.
- Save writes JSON only. Deploy (separate, confirmed action) runs `build-plates.mjs` → `version-assets.mjs` → `wrangler pages deploy` and shows full captured stdout/stderr. No git commit is ever performed by either button.
- Image upload filenames must be slugified and validated against path traversal (reject `..`, `/`, `\`, and any character outside `[a-z0-9-]` after slugifying).

---

## File Structure

- `data/plates.json` — **rewritten** to the new mixed-array shape (migration applied in Task 1).
- `data/fact-catalog.json` — **new**: master list of `{key, label}` fact types.
- `scripts/render-plate.mjs` — **new**: shared render module (`renderItem(item, index)` → HTML string, `countPlateNumber` logic, catalog label lookup).
- `scripts/build-plates.mjs` — **rewritten** to consume the new data shape via `render-plate.mjs`.
- `scripts/migrate-plates.mjs` — **new**: one-time migration script (kept in the repo as a record, run once).
- `scripts/admin-server.mjs` — **new**: zero-dependency HTTP server (static file serving + JSON API).
- `admin/index.html` — **new**: admin UI shell.
- `admin/app.js` — **new**: admin UI logic (list pane, editor pane, live preview, Save/Deploy).
- `admin/style.css` — **new**: admin UI styling (plain, functional, not matching the public site's aesthetic).
- `tests/render-plate.test.mjs` — **new**: `node:test` unit tests for the shared render module.

---

### Task 1: Fact catalog + data migration

**Files:**
- Create: `data/fact-catalog.json`
- Create: `scripts/migrate-plates.mjs`
- Modify: `data/plates.json` (output of running the migration script)
- Test: manual diff (see Step 4) — no automated test file for this task since it's a one-time data transform

**Interfaces:**
- Produces: the new `data/plates.json` shape — an array of items where each item is either
  `{ type: "bird", image, alt, species, binomial, remark, facts: [{type, value}] }`
  or `{ type: "section", title }`.
- Produces: `data/fact-catalog.json` — an array of `{ key: string, label: string }`.

- [ ] **Step 1: Create the fact catalog file**

```json
[
  { "key": "locality", "label": "Locality" },
  { "key": "season", "label": "Season" },
  { "key": "behavior", "label": "Behavior" },
  { "key": "diet", "label": "Diet" },
  { "key": "habitat", "label": "Habitat" },
  { "key": "wingspan", "label": "Wingspan" },
  { "key": "lifespan", "label": "Lifespan" },
  { "key": "conservation_status", "label": "Conservation Status" },
  { "key": "call_song", "label": "Call / Song" },
  { "key": "migration", "label": "Migration" },
  { "key": "nesting", "label": "Nesting" },
  { "key": "size_weight", "label": "Size / Weight" },
  { "key": "similar_species", "label": "Similar Species" }
]
```

Write this to `data/fact-catalog.json`.

- [ ] **Step 2: Write the migration script**

```javascript
#!/usr/bin/env node
// One-time migration: converts data/plates.json from the old flat bird-array
// shape (locality/season/behavior as fixed fields) into the new mixed
// array of { type: "bird" | "section", ... } items with a `facts` array.
import { readFileSync, writeFileSync } from 'node:fs';

const oldPlates = JSON.parse(readFileSync('data/plates.json', 'utf8'));

function migrateBird(p) {
  return {
    type: 'bird',
    image: p.image,
    alt: p.alt,
    species: p.species,
    binomial: p.binomial,
    remark: p.remark,
    facts: [
      { type: 'locality', value: p.locality },
      { type: 'season', value: p.season },
      { type: 'behavior', value: p.behavior },
    ],
  };
}

const migrated = oldPlates.map(migrateBird);
writeFileSync('data/plates.json', JSON.stringify(migrated, null, 2) + '\n');
console.log(`Migrated ${migrated.length} plates to the new facts-based shape.`);
```

Save as `scripts/migrate-plates.mjs`.

- [ ] **Step 3: Back up current build output, then run the migration**

```bash
node scripts/build-plates.mjs && cp birds/index.html /tmp/birds-index-before.html
node scripts/migrate-plates.mjs
```

Expected: `Migrated 9 plates to the new facts-based shape.` and `data/plates.json` now contains `type: "bird"` objects with a `facts` array (verify by opening the file — no need for a script check, it's a one-time human-reviewed transform).

- [ ] **Step 4: Commit**

```bash
git add data/fact-catalog.json scripts/migrate-plates.mjs data/plates.json
git commit -m "feat: migrate plates.json to facts-based shape, add fact catalog"
```

(Do not worry that `build-plates.mjs` doesn't understand the new shape yet — that's Task 3. `birds/index.html` is not regenerated again until then.)

---

### Task 2: Shared render module (`render-plate.mjs`)

**Files:**
- Create: `scripts/render-plate.mjs`
- Test: `tests/render-plate.test.mjs`

**Interfaces:**
- Consumes: `data/fact-catalog.json` shape from Task 1 (`{key, label}[]`), and bird/section items in the shape produced by Task 1.
- Produces (for Task 3 and the admin server to import):
  - `loadCatalog(): {key, label}[]` — reads and returns `data/fact-catalog.json` from cwd.
  - `factLabel(factType, catalog): string` — looks up a fact's display label, falling back to the raw `factType` string if not found in the catalog.
  - `renderBird(item, plateNumber, catalog): string` — returns the `<article class="plate">...</article>` HTML for one bird item.
  - `renderSection(item): string` — returns the `<div class="band"><span>...</span></div>` HTML for one section item.
  - `renderItems(items, catalog): string` — maps the full ordered array to HTML, handling numbering (roman numerals I–X then `n+1`, incrementing only on bird items) and joining with blank lines, returning the full plates-body string (same shape `build-plates.mjs` previously produced directly).

- [ ] **Step 1: Write the failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factLabel, renderBird, renderSection, renderItems } from '../scripts/render-plate.mjs';

const catalog = [
  { key: 'locality', label: 'Locality' },
  { key: 'season', label: 'Season' },
];

test('factLabel looks up catalog label', () => {
  assert.equal(factLabel('locality', catalog), 'Locality');
});

test('factLabel falls back to raw type when not in catalog', () => {
  assert.equal(factLabel('mystery_fact', catalog), 'mystery_fact');
});

test('renderBird breaks species name at the first space only', () => {
  const bird = {
    type: 'bird',
    image: '/images/plates/great-blue-heron.jpg',
    alt: 'alt text',
    species: 'Great Blue Heron',
    binomial: 'Ardea herodias',
    remark: 'A remark.',
    facts: [{ type: 'locality', value: 'Somewhere' }],
  };
  const html = renderBird(bird, 'I', catalog);
  assert.match(html, /<h2>Great<br>Blue Heron<\/h2>/);
  assert.match(html, /<div class="plate-no">No\. I<\/div>/);
  assert.match(html, /<dt>Locality<\/dt><dd>Somewhere<\/dd>/);
});

test('renderBird falls back to a placeholder figure when image is missing', () => {
  const bird = {
    type: 'bird', image: null, alt: 'no photo yet', species: 'Test Bird',
    binomial: 'Testus birdus', remark: 'r', facts: [],
  };
  const html = renderBird(bird, 'II', catalog);
  assert.match(html, /<div class="photo"><em>no photo yet<\/em><\/div>/);
});

test('renderSection renders the title inside a .band div', () => {
  const html = renderSection({ type: 'section', title: 'Waterfowl' });
  assert.match(html, /<div class="band">/);
  assert.match(html, /Waterfowl/);
});

test('renderItems numbers bird items with roman numerals, skipping section items', () => {
  const items = [
    { type: 'section', title: 'Waterfowl' },
    { type: 'bird', image: null, alt: 'a', species: 'Mallard', binomial: 'Anas platyrhynchos', remark: 'r', facts: [] },
    { type: 'bird', image: null, alt: 'b', species: 'Teal', binomial: 'Anas crecca', remark: 'r', facts: [] },
  ];
  const html = renderItems(items, catalog);
  assert.match(html, /No\. I(?!\w)/);
  assert.match(html, /No\. II(?!\w)/);
  assert.ok(!html.includes('No. III'));
});

test('renderItems falls back to numeric numbering past X', () => {
  const items = Array.from({ length: 11 }, (_, i) => ({
    type: 'bird', image: null, alt: `bird ${i}`, species: `Bird${i}`,
    binomial: 'Testus birdus', remark: 'r', facts: [],
  }));
  const html = renderItems(items, catalog);
  assert.match(html, /No\. 11(?!\w)/);
});
```

Save as `tests/render-plate.test.mjs`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/render-plate.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/render-plate.mjs'` (module doesn't exist yet).

- [ ] **Step 3: Implement `render-plate.mjs`**

```javascript
import { readFileSync } from 'node:fs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function loadCatalog() {
  return JSON.parse(readFileSync('data/fact-catalog.json', 'utf8'));
}

export function factLabel(factType, catalog) {
  const entry = catalog.find((c) => c.key === factType);
  return entry ? entry.label : factType;
}

export function renderBird(item, plateNumber, catalog) {
  const figure = item.image
    ? `<img class="photo" src="${item.image}" alt="${item.alt}" loading="lazy">`
    : `<div class="photo"><em>${item.alt}</em></div>`;
  const facts = (item.facts || [])
    .map((f) => `<div><dt>${factLabel(f.type, catalog)}</dt><dd>${f.value}</dd></div>`)
    .join('\n        ');
  return `  <article class="plate">
    <figure>
      ${figure}
    </figure>
    <div class="caption">
      <div class="plate-no">No. ${plateNumber}</div>
      <h2>${item.species.replace(' ', '<br>')}</h2>
      <div class="binomial">${item.binomial}</div>
      <dl class="specs">
        ${facts}
      </dl>
      <p class="remark">${item.remark}</p>
    </div>
  </article>`;
}

export function renderSection(item) {
  return `  <div class="band"><span>${item.title}</span></div>`;
}

export function renderItems(items, catalog) {
  let birdIndex = 0;
  const rendered = items.map((item) => {
    if (item.type === 'section') return renderSection(item);
    const plateNumber = ROMAN[birdIndex] ?? String(birdIndex + 1);
    birdIndex += 1;
    return renderBird(item, plateNumber, catalog);
  });
  return rendered.join('\n\n');
}
```

Save as `scripts/render-plate.mjs`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/render-plate.test.mjs`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/render-plate.mjs tests/render-plate.test.mjs
git commit -m "feat: add shared render-plate module with tests"
```

---

### Task 3: Rewrite `build-plates.mjs` to use the shared module

**Files:**
- Modify: `scripts/build-plates.mjs`

**Interfaces:**
- Consumes: `renderItems(items, catalog)` and `loadCatalog()` from `scripts/render-plate.mjs` (Task 2); the migrated `data/plates.json` shape (Task 1).

- [ ] **Step 1: Rewrite the build script**

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { renderItems, loadCatalog } from './render-plate.mjs';

const items = JSON.parse(readFileSync('data/plates.json', 'utf8'));
const catalog = loadCatalog();
const template = readFileSync('birds/index.html', 'utf8');

const body = renderItems(items, catalog);

const start = template.indexOf('<!-- PLATES:START -->') + '<!-- PLATES:START -->'.length;
const end = template.indexOf('<!-- PLATES:END -->');
if (start < 0 || end < 0) throw new Error('PLATES markers not found in birds/index.html');

const out = template.slice(0, start) + '\n' + body + '\n' + template.slice(end);
writeFileSync('birds/index.html', out);
const birdCount = items.filter((i) => i.type === 'bird').length;
console.log(`Wrote ${birdCount} plates (${items.length} items) to birds/index.html`);
```

- [ ] **Step 2: Run the build and diff against the pre-migration backup**

```bash
node scripts/build-plates.mjs
diff /tmp/birds-index-before.html birds/index.html
```

Expected: no output from `diff` (files identical) — confirms the migration + rewrite is a pure refactor with zero visual change. If there's a diff, inspect it: the only acceptable difference is whitespace inside the `<dl class="specs">` block; any content difference is a bug.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-plates.mjs birds/index.html
git commit -m "refactor: build-plates.mjs uses shared render-plate module"
```

---

### Task 4: Section-band CSS check (no new CSS, verify layout safety)

**Files:**
- Modify: `birds/index.html` (temporary manual test edit, reverted after verification) — no permanent file changes in this task unless a bug is found

**Interfaces:**
- Consumes: `.band` class already defined in `css/site.css` (confirmed during design: spruce-green `var(--field)` background, bold white text, `padding:1rem 4vw`).

- [ ] **Step 1: Manually verify `.band` renders correctly between plates and doesn't break `nth-of-type` alternation**

Temporarily add a `data/plates.json` test item (a `type: "section"` object) between two birds, run `node scripts/build-plates.mjs`, open `birds/index.html` in a browser (`npx serve .` or just open the file), and confirm:
- The green band renders full-width between the two plates.
- The plate *after* the band still alternates its image/caption layout correctly (i.e. `.plate:nth-of-type(even)` counts only `<article>` siblings, unaffected by the intervening `<div class="band">` — this is standard CSS `nth-of-type` behavior, but verify visually since it's load-bearing for this design).

- [ ] **Step 2: Revert the temporary test item**

```bash
git checkout data/plates.json birds/index.html
```

(No commit for this task — it's a verification step, not a code change. If the visual check reveals a real bug, fix it in `css/site.css` as a small follow-up commit before continuing.)

---

### Task 5: Admin server — static files + read endpoint

**Files:**
- Create: `scripts/admin-server.mjs`

**Interfaces:**
- Consumes: `data/plates.json`, `data/fact-catalog.json` (Task 1); repo root for static file serving.
- Produces: an HTTP server on `127.0.0.1:4790` with:
  - `GET /api/data` → `{ items: [...], catalog: [...] }` (JSON)
  - Static file serving for everything else, rooted at the repo root (so `/admin/index.html`, `/css/site.css`, `/images/plates/*.jpg` are all reachable).

- [ ] **Step 1: Write the server with static + read-only API**

```javascript
#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 4790;

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

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/data') {
    const items = readJson('data/plates.json');
    const catalog = readJson('data/fact-catalog.json');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items, catalog }));
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin UI: http://127.0.0.1:${PORT}/`);
});
```

- [ ] **Step 2: Create a placeholder admin page to verify the server serves it**

```html
<!DOCTYPE html>
<html><head><title>Bird Plates Admin</title></head>
<body><h1>Admin UI loading...</h1></body></html>
```

Save as `admin/index.html` (this gets fully built out in Task 8).

- [ ] **Step 3: Verify manually**

```bash
node scripts/admin-server.mjs &
sleep 1
curl -s http://127.0.0.1:4790/api/data | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4790/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4790/../../etc/passwd
kill %1
```

Expected: first curl prints JSON starting with `{"items":`; second prints `200`; third prints `404` (path traversal blocked by the `startsWith(ROOT)` check).

- [ ] **Step 4: Commit**

```bash
git add scripts/admin-server.mjs admin/index.html
git commit -m "feat: admin server with static file serving and read API"
```

---

### Task 6: Admin server — save endpoint

**Files:**
- Modify: `scripts/admin-server.mjs`

**Interfaces:**
- Produces: `POST /api/save` — body `{ items: [...], catalog: [...] }`, writes both files to disk, responds `{ ok: true }` on success, `{ ok: false, error }` (HTTP 400) on invalid JSON body.

- [ ] **Step 1: Add a body-reading helper and the save route**

```javascript
// add near the top, after imports
import { writeFileSync } from 'node:fs';

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
```

Then, inside the `createServer` callback, before the `serveStatic` fallback, add:

```javascript
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
```

(Note: the outer callback must become `async (req, res) => { ... }` for the `await` to work — update the `createServer` call signature accordingly.)

- [ ] **Step 2: Verify manually**

```bash
node scripts/admin-server.mjs &
sleep 1
curl -s -X POST http://127.0.0.1:4790/api/save \
  -H 'Content-Type: application/json' \
  -d "$(curl -s http://127.0.0.1:4790/api/data)"
git diff --stat data/plates.json data/fact-catalog.json
kill %1
```

Expected: `{"ok":true}`; `git diff --stat` shows no changes (round-tripping the same data through save should be a no-op, aside from possible key-order/whitespace normalization — if there's a diff, confirm it's only formatting, not data loss).

- [ ] **Step 3: Commit**

```bash
git add scripts/admin-server.mjs
git commit -m "feat: admin server save endpoint"
```

---

### Task 7: Admin server — image upload endpoint

**Files:**
- Modify: `scripts/admin-server.mjs`

**Interfaces:**
- Produces: `POST /api/upload-image` — body `{ species: string, filename: string, dataBase64: string }`, slugifies `species` (falling back to slugifying `filename` if `species` is empty) plus the original file extension, writes the decoded bytes to `images/plates/<slug><ext>`, responds `{ ok: true, path: "/images/plates/<slug><ext>" }`.

- [ ] **Step 1: Add a slugify helper and the upload route**

```javascript
// add near the top, after imports
import { mkdirSync } from 'node:fs';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
```

Then, inside the `createServer` callback:

```javascript
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
```

- [ ] **Step 2: Verify manually, including a path-traversal attempt**

```bash
node scripts/admin-server.mjs &
sleep 1
curl -s -X POST http://127.0.0.1:4790/api/upload-image \
  -H 'Content-Type: application/json' \
  -d '{"species":"Test Bird ../../evil","filename":"x.jpg","dataBase64":"aGVsbG8="}'
ls images/plates/ | grep -i test
rm -f images/plates/test-bird-evil.jpg
kill %1
```

Expected: response `{"ok":true,"path":"/images/plates/test-bird-evil.jpg"}` (the `../../` is stripped by slugify's `[^a-z0-9]+` replacement, not left as a literal path segment); `ls` shows the file was written inside `images/plates/`, not anywhere else.

- [ ] **Step 3: Commit**

```bash
git add scripts/admin-server.mjs
git commit -m "feat: admin server image upload endpoint with slugified, path-safe filenames"
```

---

### Task 8: Admin server — render (live preview) endpoint

**Files:**
- Modify: `scripts/admin-server.mjs`

**Interfaces:**
- Consumes: `renderBird`, `renderSection`, `loadCatalog` from `scripts/render-plate.mjs` (Task 2).
- Produces: `POST /api/render` — body `{ item: {...}, plateNumber: "I" }`, responds `{ ok: true, html }` where `html` is the exact fragment `build-plates.mjs` would produce for that single item.

- [ ] **Step 1: Add the render route**

```javascript
// add to imports
import { renderBird, renderSection, loadCatalog } from './render-plate.mjs';
```

```javascript
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
```

- [ ] **Step 2: Verify manually**

```bash
node scripts/admin-server.mjs &
sleep 1
curl -s -X POST http://127.0.0.1:4790/api/render \
  -H 'Content-Type: application/json' \
  -d '{"item":{"type":"bird","image":null,"alt":"a test bird","species":"Test Bird","binomial":"Testus birdus","remark":"A remark.","facts":[{"type":"locality","value":"Nowhere"}]}, "plateNumber":"I"}'
kill %1
```

Expected: `{"ok":true,"html":"  <article class=\"plate\">..."}` containing `Test<br>Bird` and `No. I`.

- [ ] **Step 3: Commit**

```bash
git add scripts/admin-server.mjs
git commit -m "feat: admin server live-preview render endpoint"
```

---

### Task 9: Admin server — deploy endpoint

**Files:**
- Modify: `scripts/admin-server.mjs`

**Interfaces:**
- Produces: `POST /api/deploy` — no body required, runs the three deploy commands in sequence, responds `{ ok: true, output }` where `output` is the concatenated stdout+stderr of all three commands (each command's output labeled with its command name), or `{ ok: false, output, failedAt }` if one fails partway (subsequent commands are not run).

- [ ] **Step 1: Add the deploy route**

```javascript
// add to imports
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

async function runStep(name, command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: ROOT });
    return { name, ok: true, output: stdout + stderr };
  } catch (err) {
    return { name, ok: false, output: (err.stdout || '') + (err.stderr || '') + '\n' + err.message };
  }
}
```

```javascript
  if (req.method === 'POST' && req.url === '/api/deploy') {
    const steps = [
      ['build-plates', 'node', ['scripts/build-plates.mjs']],
      ['version-assets', 'node', ['scripts/version-assets.mjs']],
      ['wrangler-deploy', 'npx', ['wrangler', 'pages', 'deploy', '.']],
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
```

- [ ] **Step 2: Verify manually (build+version steps only — do not actually trigger a real wrangler deploy during verification)**

```bash
node scripts/admin-server.mjs &
sleep 1
node -e "
fetch('http://127.0.0.1:4790/api/render', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({item:{type:'section',title:'test'}, plateNumber:'I'})
}).then(r=>r.json()).then(r=>console.log(r.ok))
"
kill %1
```

Expected: prints `true` (confirms the server with the new route still handles other endpoints correctly; full `/api/deploy` end-to-end is exercised manually once by the user from the actual admin UI in Task 11, since it has a real production side effect).

- [ ] **Step 3: Commit**

```bash
git add scripts/admin-server.mjs
git commit -m "feat: admin server deploy endpoint (build + version + wrangler)"
```

---

### Task 10: Admin frontend — list pane + editor pane

**Files:**
- Modify: `admin/index.html`
- Create: `admin/app.js`
- Create: `admin/style.css`

**Interfaces:**
- Consumes: `GET /api/data` (Task 5), `POST /api/upload-image` (Task 7).
- Produces (for Task 11): a global `AdminState` object (`{ items: [...], catalog: [...], selectedIndex: number|null }`) and a `renderList()` / `renderEditor()` pair of functions that Task 11's preview logic hooks into after every edit.

- [ ] **Step 1: Build the HTML shell**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bird Plates Admin</title>
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  <div class="admin-layout">
    <aside id="list-pane">
      <div class="list-actions">
        <button id="add-bird">+ Add Bird</button>
        <button id="add-section">+ Add Section</button>
      </div>
      <ol id="item-list"></ol>
    </aside>
    <main id="editor-pane">
      <p class="empty-state">Select an item to edit.</p>
    </main>
    <aside id="preview-pane">
      <p class="empty-state">Preview appears here.</p>
    </aside>
  </div>
  <div class="toolbar">
    <button id="save-btn">Save</button>
    <button id="deploy-btn">Deploy</button>
    <span id="status-message"></span>
  </div>
  <script type="module" src="/admin/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `admin/app.js` — state, list rendering, and item CRUD**

```javascript
const AdminState = { items: [], catalog: [], selectedIndex: null };

async function loadData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  AdminState.items = data.items;
  AdminState.catalog = data.catalog;
  renderList();
}

function romanFor(birdIndex) {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return ROMAN[birdIndex] ?? String(birdIndex + 1);
}

function renderList() {
  const list = document.getElementById('item-list');
  list.innerHTML = '';
  let birdIndex = 0;
  AdminState.items.forEach((item, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.index = String(index);
    li.className = item.type === 'section' ? 'row row-section' : 'row row-bird';

    const posInput = document.createElement('input');
    posInput.type = 'number';
    posInput.min = '1';
    posInput.value = String(index + 1);
    posInput.className = 'pos-input';
    posInput.addEventListener('change', () => moveItem(index, Number(posInput.value) - 1));

    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = item.type === 'section'
      ? `— ${item.title} —`
      : `${item.species}`;
    if (item.type === 'bird') {
      const numTag = document.createElement('span');
      numTag.className = 'row-num';
      numTag.textContent = `No. ${romanFor(birdIndex)}`;
      label.prepend(numTag);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteItem(index); });

    li.append(posInput, label);
    if (item.type === 'bird') {
      const dupBtn = document.createElement('button');
      dupBtn.textContent = 'Duplicate';
      dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateItem(index); });
      li.append(dupBtn);
    }
    li.append(delBtn);

    li.addEventListener('click', () => selectItem(index));
    li.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(index)));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      moveItem(from, index);
    });

    list.appendChild(li);
    if (item.type === 'bird') birdIndex += 1;
  });
}

function moveItem(fromIndex, toIndex) {
  const clamped = Math.max(0, Math.min(AdminState.items.length - 1, toIndex));
  const [moved] = AdminState.items.splice(fromIndex, 1);
  AdminState.items.splice(clamped, 0, moved);
  AdminState.selectedIndex = clamped;
  renderList();
  renderEditor();
}

function deleteItem(index) {
  AdminState.items.splice(index, 1);
  AdminState.selectedIndex = null;
  renderList();
  renderEditor();
}

function duplicateItem(index) {
  const copy = JSON.parse(JSON.stringify(AdminState.items[index]));
  AdminState.items.splice(index + 1, 0, copy);
  renderList();
}

function selectItem(index) {
  AdminState.selectedIndex = index;
  renderEditor();
}

document.getElementById('add-bird').addEventListener('click', () => {
  AdminState.items.push({
    type: 'bird', image: null, alt: '', species: 'New Bird',
    binomial: '', remark: '', facts: [],
  });
  AdminState.selectedIndex = AdminState.items.length - 1;
  renderList();
  renderEditor();
});

document.getElementById('add-section').addEventListener('click', () => {
  AdminState.items.push({ type: 'section', title: 'New Section' });
  AdminState.selectedIndex = AdminState.items.length - 1;
  renderList();
  renderEditor();
});

function renderEditor() {
  const pane = document.getElementById('editor-pane');
  pane.innerHTML = '';
  if (AdminState.selectedIndex === null) {
    pane.innerHTML = '<p class="empty-state">Select an item to edit.</p>';
    return;
  }
  const item = AdminState.items[AdminState.selectedIndex];
  if (item.type === 'section') {
    renderSectionEditor(pane, item);
  } else {
    renderBirdEditor(pane, item);
  }
}

function field(labelText, value, onInput, tag = 'input') {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const labelEl = document.createElement('span');
  labelEl.textContent = labelText;
  const inputEl = document.createElement(tag);
  inputEl.value = value || '';
  inputEl.addEventListener('input', () => onInput(inputEl.value));
  wrap.append(labelEl, inputEl);
  return wrap;
}

function renderSectionEditor(pane, item) {
  pane.appendChild(field('Title', item.title, (v) => { item.title = v; syncList(); }));
}

function renderBirdEditor(pane, item) {
  pane.appendChild(field('Species', item.species, (v) => { item.species = v; syncList(); }));
  pane.appendChild(field('Binomial', item.binomial, (v) => { item.binomial = v; }));
  pane.appendChild(field('Alt text', item.alt, (v) => { item.alt = v; }));
  pane.appendChild(field('Remark (HTML allowed)', item.remark, (v) => { item.remark = v; }, 'textarea'));

  const upload = document.createElement('input');
  upload.type = 'file';
  upload.accept = 'image/*';
  upload.addEventListener('change', () => uploadImage(item, upload.files[0]));
  pane.appendChild(upload);

  if (item.image) {
    const preview = document.createElement('img');
    preview.src = item.image;
    preview.className = 'thumb';
    pane.appendChild(preview);
  }

  pane.appendChild(renderFactsEditor(item));
}

function renderFactsEditor(item) {
  const wrap = document.createElement('div');
  wrap.className = 'facts-editor';
  item.facts.forEach((fact, i) => {
    const row = document.createElement('div');
    row.className = 'fact-row';
    const label = document.createElement('span');
    const catEntry = AdminState.catalog.find((c) => c.key === fact.type);
    label.textContent = catEntry ? catEntry.label : fact.type;
    const valueInput = document.createElement('input');
    valueInput.value = fact.value;
    valueInput.addEventListener('input', () => { fact.value = valueInput.value; });
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => { item.facts.splice(i, 1); renderEditor(); });
    row.append(label, valueInput, removeBtn);
    wrap.appendChild(row);
  });

  const addRow = document.createElement('div');
  addRow.className = 'add-fact-row';
  const select = document.createElement('select');
  select.innerHTML = '<option value="">-- pick a fact type --</option>' +
    AdminState.catalog.map((c) => `<option value="${c.key}">${c.label}</option>`).join('') +
    '<option value="__custom__">+ New custom fact...</option>';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add fact';
  addBtn.addEventListener('click', () => {
    let key = select.value;
    if (key === '__custom__') {
      const label = prompt('New fact label:');
      if (!label) return;
      key = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      AdminState.catalog.push({ key, label });
    }
    if (!key) return;
    item.facts.push({ type: key, value: '' });
    renderEditor();
  });
  addRow.append(select, addBtn);
  wrap.appendChild(addRow);
  return wrap;
}

async function uploadImage(item, file) {
  if (!file) return;
  const dataBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ species: item.species, filename: file.name, dataBase64 }),
  });
  const result = await res.json();
  if (result.ok) {
    item.image = result.path;
    item.alt = item.alt || '';
    renderEditor();
  } else {
    alert('Upload failed: ' + result.error);
  }
}

function syncList() { renderList(); }

loadData();
```

- [ ] **Step 3: Write `admin/style.css`**

```css
body { font-family: system-ui, sans-serif; margin: 0; color: #222; }
.admin-layout { display: grid; grid-template-columns: 260px 1fr 1fr; height: calc(100vh - 48px); }
#list-pane { overflow-y: auto; border-right: 1px solid #ccc; padding: 0.5rem; }
#item-list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem; border-bottom: 1px solid #eee; cursor: pointer; }
.row-section { background: #eaf5ec; font-weight: 700; }
.pos-input { width: 3rem; }
.row-label { flex: 1; }
.row-num { font-weight: 700; margin-right: 0.4rem; color: #1D4F2E; }
#editor-pane, #preview-pane { overflow-y: auto; padding: 1rem; }
.field { display: block; margin-bottom: 0.8rem; }
.field span { display: block; font-weight: 700; margin-bottom: 0.2rem; }
.field input, .field textarea { width: 100%; box-sizing: border-box; padding: 0.4rem; }
.thumb { max-width: 200px; display: block; margin-top: 0.5rem; }
.facts-editor { margin-top: 1rem; border-top: 2px solid #ccc; padding-top: 0.5rem; }
.fact-row { display: flex; gap: 0.5rem; margin-bottom: 0.4rem; }
.fact-row span { min-width: 8rem; font-weight: 700; }
.add-fact-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.toolbar { height: 48px; display: flex; align-items: center; gap: 1rem; padding: 0 1rem; border-top: 1px solid #ccc; }
.empty-state { color: #888; font-style: italic; }
```

- [ ] **Step 4: Manual verification**

```bash
node scripts/admin-server.mjs &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4790/admin/app.js
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4790/admin/style.css
kill %1
```

Expected: both print `200`. Then open `http://127.0.0.1:4790/` in a real browser and confirm: the 9 migrated birds list on the left, clicking one populates the editor pane with its fields and facts, "+ Add Bird"/"+ Add Section" add rows, drag-and-drop and the numeric position input both reorder the list, "Add fact" lets you pick from the catalog or type a custom one.

- [ ] **Step 5: Commit**

```bash
git add admin/index.html admin/app.js admin/style.css
git commit -m "feat: admin UI list pane and editor pane"
```

---

### Task 11: Admin frontend — live preview, Save, Deploy

**Files:**
- Modify: `admin/app.js`

**Interfaces:**
- Consumes: `POST /api/render` (Task 8), `POST /api/save` (Task 6), `POST /api/deploy` (Task 9).

- [ ] **Step 1: Add live preview rendering, hooked into every list/editor render**

Append to `admin/app.js`:

```javascript
async function renderPreview() {
  const pane = document.getElementById('preview-pane');
  if (AdminState.selectedIndex === null) {
    pane.innerHTML = '<p class="empty-state">Preview appears here.</p>';
    return;
  }
  const item = AdminState.items[AdminState.selectedIndex];
  let plateNumber = 'I';
  if (item.type === 'bird') {
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const birdsBefore = AdminState.items.slice(0, AdminState.selectedIndex).filter((i) => i.type === 'bird').length;
    plateNumber = ROMAN[birdsBefore] ?? String(birdsBefore + 1);
  }
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, plateNumber }),
  });
  const result = await res.json();
  pane.innerHTML = result.ok
    ? `<iframe class="preview-frame" srcdoc="${escapeAttr(previewDocument(result.html))}"></iframe>`
    : `<p class="empty-state">Preview error: ${result.error}</p>`;
}

function previewDocument(fragmentHtml) {
  return `<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/site.css"></head>
    <body style="margin:0"><article class="plate">${fragmentHtml.includes('class="band"') ? '' : ''}</article></body></html>`
    .replace('<article class="plate"></article>', fragmentHtml);
}

function escapeAttr(html) {
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
```

Note: `previewDocument` wraps the fragment in a full HTML doc linking the real site CSS (fetched from the admin server's static file serving, Task 5) so the iframe preview looks exactly like the live site.

- [ ] **Step 2: Wire `renderPreview()` into the existing render calls**

Update `renderEditor()`'s end to also call the preview, and update `selectItem`, `moveItem`, and the field-change handlers to keep the preview fresh. Simplest approach: call `renderPreview()` at the end of `renderEditor()`, and call `renderEditor()` (not just field mutation) after every field's `input` event by changing the `field()` helper's `onInput` wiring to also trigger a debounced preview refresh:

```javascript
// Replace the field() function's oninput listener with:
inputEl.addEventListener('input', () => { onInput(inputEl.value); renderPreview(); });
```

And add `renderPreview();` as the last line inside `renderEditor()`, and inside `selectItem()`, `moveItem()`, and the "Add fact"/"Remove" fact handlers wherever `renderEditor()` is already called (since `renderEditor()` now triggers the preview at its end, no other call sites need direct changes).

- [ ] **Step 3: Add Save and Deploy button wiring**

```javascript
document.getElementById('save-btn').addEventListener('click', async () => {
  const status = document.getElementById('status-message');
  status.textContent = 'Saving...';
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: AdminState.items, catalog: AdminState.catalog }),
  });
  const result = await res.json();
  status.textContent = result.ok ? 'Saved.' : `Save failed: ${result.error}`;
});

document.getElementById('deploy-btn').addEventListener('click', async () => {
  if (!confirm('This will build, version, and deploy the live site via wrangler. Continue?')) return;
  const status = document.getElementById('status-message');
  status.textContent = 'Deploying... (this may take a minute)';
  const res = await fetch('/api/deploy', { method: 'POST' });
  const result = await res.json();
  status.textContent = result.ok ? 'Deployed.' : `Deploy failed at ${result.failedAt}.`;
  console.log(result.output);
  alert(result.output);
});
```

- [ ] **Step 4: Manual end-to-end verification**

```bash
node scripts/admin-server.mjs &
sleep 1
```

Open `http://127.0.0.1:4790/` in a browser:
- Select a bird, confirm the preview pane shows its rendered plate matching the live site's look (photo, species, binomial, facts, remark).
- Select a section header, confirm the preview shows the green band with its title.
- Edit a field, confirm the preview updates.
- Click Save, confirm `git diff data/plates.json` (in a terminal) shows the change persisted.
- Do **not** click Deploy during this automated verification step — that has a real production side effect and should be triggered by the user deliberately, once, outside of plan execution.

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add admin/app.js
git commit -m "feat: admin UI live preview, Save, and Deploy wiring"
```

---

## Post-Plan Manual Step (user-triggered, not part of task execution)

Once all tasks are committed, the user should personally run the admin UI (`node scripts/admin-server.mjs`), make a real edit (e.g. add the first section header), click Save, review `git diff`, and — only when satisfied — click Deploy once to confirm the full production path works. This is deliberately left as a manual, human-triggered action rather than an automated plan step, since it pushes to the live site.
