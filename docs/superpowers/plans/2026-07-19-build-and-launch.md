# Build & Launch tusensii.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the two approved static mockups (`direction-b-home.html`, `direction-birds.html`) into a production static site, hosted on Cloudflare Pages at `tusensii.com`, with the domain connected and HTTPS working.

**Architecture:** Plain HTML/CSS, no framework, no bundler. One shared stylesheet (`/css/site.css`) with design tokens as CSS custom properties. Bird plates are generated from a small JSON data file by a tiny Node build script (`scripts/build-plates.mjs`) that injects generated markup into `birds/index.html` between HTML comment markers — no client JS framework, no server. Git repo on GitHub (`tusensii/tusensii.com`), deployed via Cloudflare Pages connected to `main`.

**Tech Stack:** Plain HTML5, CSS3 (custom properties), vanilla JS (only the existing `IntersectionObserver` scroll-reveal), Node.js (dev-only, for the plate build script), Cloudflare Pages, Cloudflare DNS, GitHub (`gh` CLI, already authenticated as `tusensii`).

## Global Constraints

- Colors: `#FFFFFF` (paper), `#141311` (ink), `#1D4F2E` (spruce green). No other colors, ever.
- Fonts: Anton (display/uppercase) + Archivo (body), via Google Fonts only. No other fonts.
- 3px solid ink rules as the primary structural device. Zero border-radius anywhere.
- SVG film-grain overlay (`body::after`) present on every page, unchanged.
- Motion limited to: marquee strip (hero), plate scroll-reveal (IntersectionObserver), hover inversions. All motion must respect `prefers-reduced-motion: reduce`.
- Never introduce: Inter/Space Grotesk/Geist/Instrument Serif fonts, purple/lavender, gradients, colored glows/shadows, glassmorphism, dark mode, rounded corners, colored left borders, icon-topped feature cards, emoji in UI, badges above headlines, stat banners, numbered 1-2-3 steps, shadcn/component libraries. If a task seems to need one of these, stop and ask Christopher instead of improvising.
- Do not restyle, "improve," or add sections beyond what the mockups already contain — the visual system is final.
- Confirm with Christopher before: any DNS/nameserver change, any deploy to production, any deletion.

---

### Task 1: Repo scaffolding

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Modify: none yet (mockups stay in place until Task 2 moves their content)

**Interfaces:**
- Produces: initialized git repo, ready for commits.

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/christopherpetrie/Coding/tusensii.com
git init
git branch -M main
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
.DS_Store
*.log
```

- [ ] **Step 3: Write short `README.md`**

```markdown
# tusensii.com

Christopher's personal site — games, field photography, and personal
infrastructure. Static HTML/CSS/vanilla JS, no framework.

## Structure

- `index.html` — homepage
- `birds/index.html` — field plates (bird photography)
- `about/index.html` — about stub
- `css/site.css` — shared stylesheet (design tokens as CSS custom properties)
- `data/plates.json` — bird plate data
- `scripts/build-plates.mjs` — regenerates the plate markup in `birds/index.html` from `data/plates.json`
- `images/plates/` — plate photos

## Adding a bird plate

See the "Adding a plate" section below (added once the photo pipeline is live).

## Local preview

```bash
npx serve .
```
```

- [ ] **Step 4: Verify**

Run: `git status` — expect a clean init with untracked files listed, no commit yet.

- [ ] **Step 5: Commit**

```bash
git add .gitignore README.md
git commit -m "chore: initialize repo"
```

---

### Task 2: Shared stylesheet extraction

**Files:**
- Create: `css/site.css`

**Interfaces:**
- Consumes: the `<style>` blocks in `direction-b-home.html` and `direction-birds.html` (near-identical token sets and base rules, page-specific rules differ).
- Produces: `css/site.css` with three sections in this order: `:root` tokens + base/reset + header/footer (shared across all pages), then homepage-only rules (`.hero`, `.hero-strip`, `.board`, `.panel`), then birds-only rules (`.masthead`, `.plate`, `.photo`, `.caption`, `.specs`, `.band`), each clearly delimited by a comment banner. Class names are unchanged from the mockups so no HTML needs to change.

- [ ] **Step 1: Create `css/site.css`**

Merge the two `<style>` blocks read from the mockups verbatim (tokens, reset, film grain, header/footer, hero, board/panel, masthead, plate, band rules, and both `@media` blocks), deduplicating the identical shared rules (`:root`, `*`, `body`, `body::after`, `a`, `::selection`, `header`, `.mark`, `nav a`, `footer`) into one copy. Keep every property value byte-identical to the source mockups — this is a lift-and-merge, not a rewrite.

- [ ] **Step 2: Verify no rule was dropped**

Run: `grep -c '{' css/site.css` and compare against the combined rule count from both mockups' `<style>` blocks (dedup only the shared selectors listed above — expect the count to drop by exactly the number of duplicated shared selectors).

- [ ] **Step 3: Commit**

```bash
git add css/site.css
git commit -m "refactor: extract shared stylesheet from mockups"
```

---

### Task 3: Real routes — homepage

**Files:**
- Create: `index.html`
- Delete: `direction-b-home.html` (after content is migrated)

**Interfaces:**
- Consumes: `css/site.css` (Task 2).
- Produces: `index.html` at the site root, nav links pointing to real routes (`/birds/`, `/about/`), footer GitHub link pointing to `https://github.com/tusensii`.

- [ ] **Step 1: Create `index.html`**

Copy `direction-b-home.html` body structure into `index.html`. Replace the inline `<style>` block with `<link rel="stylesheet" href="/css/site.css">`. Update:
- nav: `<a href="/birds/">Birds</a>`, `<a href="/about/">About</a>`
- `.board` "Birds" panel CTA: `<a class="cta" href="/birds/">See the plates</a>`
- footer: already correct (`https://thegreatmoviegame.biz` and `https://github.com/tusensii` per spec — confirm both are present)
- add `<title>`, meta description, OG tags, favicon link (placeholders wired up in Task 6)

- [ ] **Step 2: Verify locally**

Run: `npx serve .` then open `http://localhost:3000/` — page renders with hero, marquee, two panels, footer; no console errors.

- [ ] **Step 3: Remove the old mockup file**

```bash
git rm direction-b-home.html
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: productionize homepage as index.html"
```

---

### Task 4: Real routes — birds page + plate data pipeline

**Files:**
- Create: `birds/index.html`
- Create: `data/plates.json`
- Create: `scripts/build-plates.mjs`
- Create: `images/plates/.gitkeep` (real images added later by Christopher)
- Delete: `direction-birds.html` (after content is migrated)

**Interfaces:**
- Consumes: `css/site.css` (Task 2).
- Produces: `data/plates.json` schema — array of objects: `{ "image": "/images/plates/<file>.jpg", "alt": "...", "species": "Cedar Waxwing", "binomial": "Bombycilla cedrorum", "locality": "...", "season": "...", "behavior": "...", "remark": "<strong>...</strong> markup allowed" }`. `scripts/build-plates.mjs` reads this file and writes generated `<article class="plate">...</article>` markup into `birds/index.html` between `<!-- PLATES:START -->` and `<!-- PLATES:END -->` markers, preserving the existing "MORE PLATES AS THE LIST GROWS" band after the 2nd plate (hardcoded position, matching the mockup) and the header/masthead/footer untouched.

- [ ] **Step 1: Extract plate data to `data/plates.json`**

```json
[
  {
    "image": null,
    "alt": "Cedar waxwing stripping a crab apple",
    "species": "Cedar Waxwing",
    "binomial": "Bombycilla cedrorum",
    "locality": "Union Bay Natural Area, Seattle",
    "season": "Late winter",
    "behavior": "Stripping a crab apple, methodically",
    "remark": "The mask makes every waxwing look like it knows something you don't. <strong>This one did:</strong> the fruit two branches over was better."
  },
  {
    "image": null,
    "alt": "Japanese cormorant drying its wings",
    "species": "Japanese Cormorant",
    "binomial": "Phalacrocorax capillatus",
    "locality": "Enoshima, Kanagawa",
    "season": "Spring",
    "behavior": "Wings spread to the sea wind",
    "remark": "An ID argued over lunch and settled by gular skin. <strong>The best souvenir</strong> from that trip weighs nothing."
  },
  {
    "image": null,
    "alt": "Great blue heron standing still in shallow water",
    "species": "Great Blue Heron",
    "binomial": "Ardea herodias",
    "locality": "Nisqually National Wildlife Refuge",
    "season": "Autumn",
    "behavior": "Hunting; patience as a verb",
    "remark": "Forty minutes without moving, then one strike. <strong>Herons understand something about attention</strong> that I keep trying to learn."
  }
]
```

When `image` is `null`, the build script renders the existing dashed-placeholder `<em>` block (using `alt` as the placeholder caption) instead of an `<img>`, so the page works before real photos exist.

- [ ] **Step 2: Write `scripts/build-plates.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const plates = JSON.parse(readFileSync('data/plates.json', 'utf8'));
const template = readFileSync('birds/index.html', 'utf8');

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function plateMarkup(p, i) {
  const figure = p.image
    ? `<img class="photo" src="${p.image}" alt="${p.alt}" loading="lazy">`
    : `<div class="photo"><em>${p.alt}</em></div>`;
  return `  <article class="plate">
    <figure>
      ${figure}
    </figure>
    <div class="caption">
      <div class="plate-no">PLATE ${roman[i] ?? i + 1}</div>
      <h2>${p.species.replace(' ', '<br>')}</h2>
      <div class="binomial">${p.binomial}</div>
      <dl class="specs">
        <div><dt>Locality</dt><dd>${p.locality}</dd></div>
        <div><dt>Season</dt><dd>${p.season}</dd></div>
        <div><dt>Behavior</dt><dd>${p.behavior}</dd></div>
      </dl>
      <p class="remark">${p.remark}</p>
    </div>
  </article>`;
}

const band = `  <div class="band">
    <span>MORE PLATES AS THE LIST GROWS</span>
    <span>NISQUALLY · DISCOVERY PARK · GRANITE MTN</span>
  </div>`;

const body = plates.length > 2
  ? [...plates.slice(0, 2).map(plateMarkup), band, ...plates.slice(2).map((p, i) => plateMarkup(p, i + 2))].join('\n\n')
  : plates.map(plateMarkup).join('\n\n');

const start = template.indexOf('<!-- PLATES:START -->') + '<!-- PLATES:START -->'.length;
const end = template.indexOf('<!-- PLATES:END -->');
if (start < 0 || end < 0) throw new Error('PLATES markers not found in birds/index.html');

const out = template.slice(0, start) + '\n' + body + '\n' + template.slice(end);
writeFileSync('birds/index.html', out);
console.log(`Wrote ${plates.length} plates to birds/index.html`);
```

- [ ] **Step 3: Create `birds/index.html` with markers**

Copy `direction-birds.html` structure into `birds/index.html`. Replace inline `<style>` with `<link rel="stylesheet" href="/css/site.css">`. Update nav (`href="/"`, `href="/birds/"` marked `.here`, `href="/about/"`). Replace the three hardcoded `<article class="plate">` blocks and the `.band` div with:
```html
<!-- PLATES:START -->
<!-- PLATES:END -->
```
Keep the `<script>` IntersectionObserver block at the bottom unchanged.

- [ ] **Step 4: Run the build script**

```bash
mkdir -p images/plates && touch images/plates/.gitkeep
node scripts/build-plates.mjs
```

- [ ] **Step 5: Verify output matches the original mockup structure**

Run: `npx serve .` then open `http://localhost:3000/birds/` — three plates render with placeholder photo blocks, band appears after plate II, scroll-reveal animates plates in, captions match the original copy exactly.

- [ ] **Step 6: Remove the old mockup file**

```bash
git rm direction-birds.html
```

- [ ] **Step 7: Commit**

```bash
git add birds/ data/plates.json scripts/build-plates.mjs images/plates/.gitkeep
git commit -m "feat: productionize birds page with data-driven plate pipeline"
```

---

### Task 5: About stub page

**Files:**
- Create: `about/index.html`

**Interfaces:**
- Consumes: `css/site.css` (Task 2).
- Produces: minimal page in the same design language — header (with "About" nav item marked `.here`), a masthead-style `<h1>` ("About"), one short placeholder paragraph, footer. No new components.

- [ ] **Step 1: Write `about/index.html`**

Reuse the `header`/`footer` markup and `.masthead` styling from `birds/index.html` (masthead h1 + one paragraph, no `.deck` stat row since that would read as a stat banner — just the h1 and a single `<p>` in normal body copy below it, inside a padded div using existing spacing conventions, no new CSS class needed beyond reusing `.masthead` for the rule and heading and a plain `<p>` with existing body font-size).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About — TUSENSII</title>
<meta name="description" content="About Christopher and TUSENSII.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
  <header>
    <a class="mark" href="/">TUSENSII</a>
    <nav>
      <a href="/">Work</a>
      <a href="/birds/">Birds</a>
      <a class="here" href="/about/">About</a>
    </nav>
  </header>

  <section class="masthead">
    <h1>About</h1>
  </section>

  <div style="padding:3rem 4vw;max-width:60ch">
    <p>Placeholder — Christopher will write this.</p>
  </div>

  <footer>
    <span>© 2026 Christopher — set in Anton &amp; Archivo</span>
    <a href="https://github.com/tusensii">github.com/tusensii</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Verify**

Run: `npx serve .` then open `http://localhost:3000/about/` — masthead renders, nav highlights "About", no dead links.

- [ ] **Step 3: Commit**

```bash
git add about/
git commit -m "feat: add about stub page"
```

---

### Task 6: Production hygiene (meta, favicon, OG image, 404, robots.txt, contrast)

**Files:**
- Modify: `index.html`, `birds/index.html`, `about/index.html` (add/confirm `<title>`, meta description, OG tags, favicon link)
- Create: `favicon.svg`
- Create: `images/og-default.svg` (or `.png` if SVG OG images prove unreliable in link previews — see Step 3)
- Create: `404.html`
- Create: `robots.txt`

**Interfaces:**
- Produces: every page has a unique `<title>` and `<meta name="description">`; `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on every page; a shared favicon; a 404 page in the same design language; `robots.txt` allowing all crawling and pointing to the sitemap-less site (no sitemap needed at this size).

- [ ] **Step 1: Create `favicon.svg`** — green (`#1D4F2E`) square, white 5-point star (★) centered, zero border-radius, no text.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1D4F2E"/>
  <path fill="#FFFFFF" d="M32 10l5.9 12.3 13.6 1.7-9.9 9.5 2.6 13.5L32 40.5 19.8 47l2.6-13.5-9.9-9.5 13.6-1.7z"/>
</svg>
```

- [ ] **Step 2: Add favicon link to all three pages**

Add `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` to `<head>` of `index.html` and `birds/index.html` (already present in `about/index.html` from Task 5).

- [ ] **Step 3: Create OG image**

Build `images/og-default.svg` (1200×630, paper background, ink 3px border, "TUSENSII★" in Anton-style bold caps, spruce green accent bar) — since most social scrapers (Facebook, Slack, iMessage) render SVG unreliably, convert to PNG: `npx --yes sharp-cli -i images/og-default.svg -o images/og-default.png resize 1200 630` (if `sharp-cli` fails to install, ask Christopher whether to hand-craft the PNG in a design tool instead — do not substitute a raster export tool that pulls in unrelated dependencies).

- [ ] **Step 4: Add title/meta/OG block to each page's `<head>`**

Per-page block (values differ per page, structure identical):

```html
<title>TUSENSII — projects, loudly</title>
<meta name="description" content="Games, field photography, and personal infrastructure from Christopher — TUSENSII.">
<meta property="og:type" content="website">
<meta property="og:title" content="TUSENSII — projects, loudly">
<meta property="og:description" content="Games, field photography, and personal infrastructure from Christopher — TUSENSII.">
<meta property="og:image" content="https://tusensii.com/images/og-default.png">
<meta property="og:url" content="https://tusensii.com/">
```

Repeat for `/birds/` (title: "TUSENSII — field plates", description about bird photography) and `/about/` (title: "About — TUSENSII").

- [ ] **Step 5: Create `404.html`** in the same design language — reuse header/footer, masthead-style "404" heading, one line of body copy, a link back to `/`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Not found — TUSENSII</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
  <header>
    <a class="mark" href="/">TUSENSII</a>
    <nav>
      <a href="/">Work</a>
      <a href="/birds/">Birds</a>
      <a href="/about/">About</a>
    </nav>
  </header>
  <section class="masthead">
    <h1>404</h1>
  </section>
  <div style="padding:3rem 4vw;max-width:60ch">
    <p>Nothing here. <a href="/" style="text-decoration:underline">Back to work.</a></p>
  </div>
  <footer>
    <span>© 2026 Christopher — set in Anton &amp; Archivo</span>
    <a href="https://github.com/tusensii">github.com/tusensii</a>
  </footer>
</body>
</html>
```

- [ ] **Step 6: Create `robots.txt`**

```
User-agent: *
Allow: /
```

- [ ] **Step 7: Verify WCAG AA contrast**

Check the three color pairs used for text: ink-on-paper (`#141311` on `#FFFFFF`), paper-on-green (`#FFFFFF` on `#1D4F2E`), and green-on-paper (`#1D4F2E` on `#FFFFFF`, used for links/accents). Run each pair through a contrast calculator (e.g. `npx --yes wcag-contrast-checker` or a manual WebAIM check) and confirm all three meet 4.5:1 for body text / 3:1 for large text. Record the three ratios in the commit message or task notes.

- [ ] **Step 8: Commit**

```bash
git add favicon.svg images/og-default.svg images/og-default.png 404.html robots.txt index.html birds/index.html about/index.html
git commit -m "chore: production hygiene — meta, OG, favicon, 404, robots.txt"
```

---

### Task 7: Pre-launch verification

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Serve locally**

```bash
npx serve .
```

- [ ] **Step 2: Desktop + mobile check**

Open `http://localhost:3000/`, `/birds/`, `/about/`, `/404-does-not-exist` in a browser at desktop width and resized to ~380px. Confirm layout matches the mockups at both sizes (grid collapses to single column on `/` and `/birds/` per the existing `@media (max-width:760px)` rules).

- [ ] **Step 3: Keyboard navigation**

Tab through each page. Confirm every link/CTA gets a visible focus ring (`.cta:focus-visible` outline already defined; confirm plain `<a>` tags also show the browser default or an equivalent visible outline — add a minimal `a:focus-visible{outline:3px solid var(--field);outline-offset:2px}` to `css/site.css` if any link is missing a visible focus state).

- [ ] **Step 4: Reduced motion**

Enable "prefers reduced motion" in OS/browser dev tools, reload `/` and `/birds/`. Confirm the marquee stops and plates render immediately without the fade/slide transition.

- [ ] **Step 5: Prohibited-pattern sweep**

Run: `grep -riE "inter|space grotesk|geist|instrument serif|purple|lavender|gradient|border-radius|box-shadow.*(#[0-9a-f]{3,6})" css/site.css *.html birds/*.html about/*.html` — expect no matches (a `box-shadow` match on a non-color value like `0 0 0 3px` for focus rings is fine; a colored glow is not).

- [ ] **Step 6: Show Christopher for review**

Report back: local URLs, what was checked, any contrast ratios from Task 6 Step 7. Wait for his go-ahead before proceeding to Task 8.

---

### Task 8: Cloudflare Pages hosting

**Files:** none (infra only)

**Interfaces:** none.

- [ ] **Step 1: Create the GitHub repo**

```bash
gh repo create tusensii/tusensii.com --public --source=. --remote=origin
```

- [ ] **Step 2: Push**

```bash
git push -u origin main
```

- [ ] **Step 3: Connect Cloudflare Pages to the repo**

Explain to Christopher, in plain terms, that this step happens in the Cloudflare dashboard (Workers & Pages → Create → Pages → Connect to Git) since it requires an interactive GitHub OAuth grant that can't be scripted. Framework preset: "None"; build command: `node scripts/build-plates.mjs` (build output directory: `/`, root directory: `/`). Wait for Christopher to complete this and report back the `*.pages.dev` URL Cloudflare assigns.

- [ ] **Step 4: Verify the `*.pages.dev` preview URL**

Open the assigned `*.pages.dev` URL, confirm all three pages load, fonts load, links work.

- [ ] **Step 5: Commit** (only if any script/config changed during this task — otherwise skip, nothing to commit)

---

### Task 9: Domain connection

**Files:** none (infra only)

**Interfaces:** none.

- [ ] **Step 1: Confirm where `tusensii.com` is registered vs. where DNS is hosted**

Ask Christopher to check (or check together): is the domain's nameserver already pointed at Cloudflare (likely, since he said "purchased tusensii.com" via Cloudflare — Cloudflare Registrar domains use Cloudflare DNS automatically)? Confirm in the Cloudflare dashboard under the domain's "DNS" tab.

- [ ] **Step 2: Add the custom domain in Cloudflare Pages**

In the Pages project → Custom domains → Add `tusensii.com` and `www.tusensii.com`. Cloudflare auto-creates the needed DNS records (CNAME/`ALIAS` for the apex, CNAME for `www`) since the zone is already on Cloudflare. **Confirm with Christopher before clicking "Activate domain"** — this is the DNS change step the spec calls out as needing explicit confirmation.

- [ ] **Step 3: Choose and confirm redirect direction**

Ask Christopher whether `www.tusensii.com` should redirect to the apex `tusensii.com` or vice versa (Cloudflare Pages defaults to serving both; a redirect rule is a small addition in Rules → Redirect Rules). Default recommendation: redirect `www` → apex, since all example links in the spec use the bare domain.

- [ ] **Step 4: Wait for HTTPS to provision**

Cloudflare auto-issues a Universal SSL cert once the domain is added; this can take a few minutes. Confirm `https://tusensii.com` loads with a valid padlock before calling this done.

---

### Task 10: Production smoke test

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Verify apex + www**

Open `https://tusensii.com/` and `https://www.tusensii.com/` — confirm both resolve, HTTPS is valid, and the redirect (per Task 9 Step 3) behaves as chosen.

- [ ] **Step 2: Verify both content pages**

Open `https://tusensii.com/birds/` and `https://tusensii.com/about/` — confirm they load, fonts render (Anton + Archivo, not fallback), no mixed-content warnings.

- [ ] **Step 3: Verify the game link**

Click "Play it now" on the homepage — confirm it opens `https://thegreatmoviegame.biz`.

- [ ] **Step 4: Verify 404 handling**

Open `https://tusensii.com/does-not-exist` — confirm Cloudflare Pages serves `404.html` (Pages does this automatically for a file literally named `404.html` at the root) in the correct design, not a generic Cloudflare error page.

- [ ] **Step 5: Report final deliverables to Christopher**

Live URL, repo URL, one-paragraph "how to add a bird plate" (edit `data/plates.json`, add a photo to `images/plates/`, run `node scripts/build-plates.mjs`, commit, push — Cloudflare rebuilds automatically), and one-paragraph "how to add a future project panel to the homepage" (duplicate a `.panel` article in `index.html`, adjust `.tag`/`h2`/`p`/`.cta`/`.stamp` content and href, keep the two-column `.board` grid at exactly two children or adjust `grid-template-columns` if adding a third).
