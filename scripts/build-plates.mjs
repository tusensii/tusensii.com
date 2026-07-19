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
      <div class="plate-no">No. ${roman[i] ?? i + 1}</div>
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
    <span>MORE BIRDS AS THE LIST GROWS</span>
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
