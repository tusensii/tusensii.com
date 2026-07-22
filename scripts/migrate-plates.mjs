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
