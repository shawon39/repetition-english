#!/usr/bin/env node
// Merges full-sentence Bengali translations from data/bn/<topic>/<level>.json
// ({ "<grammar>/<type>/<id>": "বাংলা" }) into each item as `bn`, right after `en`,
// then rewrites the track in the canonical one-item-per-line format.
// Usage: node scripts/merge-bn.mjs [topic ...]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
const only = process.argv.slice(2);

function formatTrack(track) {
  const lines = ['{'];
  const head = ['topic', 'level', 'title', 'story', 'storyBn'];
  for (const k of head) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(track[k])},`);
  lines.push('  "units": [');
  track.units.forEach((u, ui) => {
    lines.push('    {');
    lines.push(`      "grammar": ${JSON.stringify(u.grammar)},`);
    lines.push(`      "focus": ${JSON.stringify(u.focus)},`);
    lines.push(`      "focusBn": ${JSON.stringify(u.focusBn)},`);
    lines.push('      "sessions": [');
    u.sessions.forEach((s, si) => {
      lines.push('        {');
      lines.push(`          "type": ${JSON.stringify(s.type)},`);
      lines.push(`          "pattern": ${JSON.stringify(s.pattern)},`);
      lines.push(`          "tipBn": ${JSON.stringify(s.tipBn)},`);
      lines.push('          "items": [');
      s.items.forEach((it, ii) => {
        const ordered = { id: it.id, ...(it.title ? { title: it.title } : {}), en: it.en, ...(it.bn ? { bn: it.bn } : {}), words: it.words };
        lines.push(`            ${JSON.stringify(ordered)}${ii < s.items.length - 1 ? ',' : ''}`);
      });
      lines.push('          ]');
      lines.push(`        }${si < u.sessions.length - 1 ? ',' : ''}`);
    });
    lines.push('      ]');
    lines.push(`    }${ui < track.units.length - 1 ? ',' : ''}`);
  });
  lines.push('  ]');
  lines.push('}');
  return lines.join('\n') + '\n';
}

let missing = 0;
let merged = 0;
for (const topic of catalog.topics.map((t) => t.id)) {
  if (only.length && !only.includes(topic)) continue;
  for (const level of catalog.levels.map((l) => l.id)) {
    const trackPath = join(root, `data/topics/${topic}/${level}.json`);
    const bnPath = join(root, `data/bn/${topic}/${level}.json`);
    if (!existsSync(trackPath)) continue;
    const track = JSON.parse(readFileSync(trackPath, 'utf8'));
    const bn = existsSync(bnPath) ? JSON.parse(readFileSync(bnPath, 'utf8')) : {};
    const used = new Set();
    for (const u of track.units) for (const s of u.sessions) for (const it of s.items) {
      const key = `${u.grammar}/${s.type}/${it.id}`;
      if (bn[key]) { it.bn = bn[key].trim(); used.add(key); merged++; }
      else if (!it.bn) { missing++; console.log(`missing ${topic}/${level} ${key}`); }
    }
    for (const key of Object.keys(bn)) if (!used.has(key)) console.log(`unknown key ${topic}/${level} ${key}`);
    writeFileSync(trackPath, formatTrack(track));
  }
}
console.log(`merged ${merged}, missing ${missing}`);
