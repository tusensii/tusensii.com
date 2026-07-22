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
