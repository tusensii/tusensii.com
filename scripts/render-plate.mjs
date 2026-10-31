import { readFileSync } from 'node:fs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Plate data is edited through the local admin UI, so treat every field as
// untrusted text: escape it, then re-allow only the bare emphasis tags the
// remarks actually use (no attributes, so no event handlers or links).
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function richText(value) {
  return escapeHtml(value).replace(/&lt;(\/?)(strong|em|b|i)&gt;/g, '<$1$2>');
}

// Images are only ever site-relative uploads; anything else (javascript:,
// data:, external hosts) is dropped rather than rendered.
function safeImagePath(value) {
  return typeof value === 'string' && /^\/images\/[\w./-]+$/.test(value) && !value.includes('..')
    ? value
    : null;
}

export function loadCatalog() {
  return JSON.parse(readFileSync('data/fact-catalog.json', 'utf8'));
}

export function factLabel(factType, catalog) {
  const entry = catalog.find((c) => c.key === factType);
  return entry ? entry.label : factType;
}

export function renderBird(item, plateNumber, catalog) {
  const image = safeImagePath(item.image);
  const figure = image
    ? `<img class="photo" src="${escapeHtml(image)}" alt="${escapeHtml(item.alt)}" loading="lazy">`
    : `<div class="photo"><em>${escapeHtml(item.alt)}</em></div>`;
  const facts = (item.facts || [])
    .map((f) => `<div><dt>${escapeHtml(factLabel(f.type, catalog))}</dt><dd>${escapeHtml(f.value)}</dd></div>`)
    .join('\n        ');
  return `  <article class="plate">
    <figure>
      ${figure}
    </figure>
    <div class="caption">
      <div class="plate-no">No. ${escapeHtml(plateNumber)}</div>
      <h2>${escapeHtml(item.species).replace(' ', '<br>')}</h2>
      <div class="binomial">${escapeHtml(item.binomial)}</div>
      <dl class="specs">
        ${facts}
      </dl>
      <p class="remark">${richText(item.remark)}</p>
    </div>
  </article>`;
}

export function renderSection(item) {
  return `  <div class="band"><span>${escapeHtml(item.title)}</span></div>`;
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
