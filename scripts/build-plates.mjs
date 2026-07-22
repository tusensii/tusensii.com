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
