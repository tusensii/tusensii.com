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

Add an entry to `data/plates.json` (image path, alt text, species, binomial,
locality, season, behavior, remark), drop the photo into `images/plates/`,
then run `node scripts/build-plates.mjs` to regenerate the plate markup.
Commit and push — Cloudflare Pages rebuilds automatically.

## Local preview

```bash
npx serve .
```
