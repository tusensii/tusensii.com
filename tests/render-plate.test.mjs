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
