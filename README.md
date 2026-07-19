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
- `scripts/version-assets.mjs` — stamps `css/site.css` with a content hash across every page, so a stale cache can never serve old CSS under a URL that looks unchanged
- `images/plates/` — plate photos

## Adding a bird plate

Add an entry to `data/plates.json` (image path, alt text, species, binomial,
locality, season, behavior, remark), drop the photo into `images/plates/`,
then run `node scripts/build-plates.mjs` to regenerate the plate markup.

## Deploying

```bash
node scripts/build-plates.mjs
node scripts/version-assets.mjs
git add -A && git commit -m "..." && git push origin main
npx wrangler pages deploy . --project-name=tusensii-com --branch=main --commit-dirty=true
```

Deploys are manual (not git-triggered) — always run both scripts before
`wrangler pages deploy`, or CSS changes may not show up for visitors with a
cached copy of the previous stylesheet.

## Local preview

```bash
npx serve .
```
