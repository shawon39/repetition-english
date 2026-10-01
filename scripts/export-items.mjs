#!/usr/bin/env node
// Prints every item of one track as "key<TAB>english" so translators can work
// line by line. Usage: node scripts/export-items.mjs <topic> <level>
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [topic, level] = process.argv.slice(2);
const track = JSON.parse(readFileSync(join(root, `data/topics/${topic}/${level}.json`), 'utf8'));
for (const unit of track.units) {
  for (const session of unit.sessions) {
    for (const item of session.items) {
      console.log(`${unit.grammar}/${session.type}/${item.id}\t${item.title ? `[${item.title}] ` : ''}${item.en}`);
    }
  }
}
