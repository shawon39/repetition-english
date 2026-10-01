#!/usr/bin/env node
// Validates every track file in data/topics against data/catalog.json and
// docs/CONTENT_GUIDE.md. Usage: node scripts/validate-data.mjs [topic ...]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
const onlyTopics = process.argv.slice(2);

const POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'phrase', 'phrasal verb', 'idiom',
  'preposition', 'pronoun', 'conjunction', 'other',
]);
const LIMITS = {
  starter: { words: [3, 7], gloss: [1, 2] },
  elementary: { words: [5, 10], gloss: [1, 3] },
  intermediate: { words: [8, 16], gloss: [2, 3], para: { sentences: [3, 4], words: [35, 60], gloss: [3, 5] } },
  advanced: { words: [12, 25], gloss: [2, 4], para: { sentences: [4, 6], words: [55, 90], gloss: [4, 6] } },
};
const YES_NO_START = /^(is|are|am|was|were|do|does|did|will|would|can|could|shall|should|may|might|must|have|has|had|need)\b/i;
const NEG_Q_START = /^(isn't|aren't|wasn't|weren't|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|haven't|hasn't|hadn't|mustn't|needn't)\b/i;
const WH_START = /^(what|where|when|why|who|whom|whose|which|how)\b/i;
const NEGATION = /\b(not|never|no|nobody|nothing|nowhere|none|neither|nor|cannot)\b|n't\b/i;
const HARD_NEG = /\b(not|never|cannot)\b|n't\b/i;
const BENGALI = /[ঀ-৿]/;
const BAD_CHARS = /[°“”‘’€$£\u{1F300}-\u{1FAFF}☀-➿]/u;

let errors = 0;
let warnings = 0;
const totals = { tracks: 0, sessions: 0, items: 0 };

const norm = (s) => s.replace(/[’‘]/g, "'");
const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const sentenceCount = (s) => (s.match(/[.!?](\s|$)/g) || []).length;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsPhrase = (text, phrase) =>
  new RegExp(`(?<![A-Za-z0-9'])${escapeRe(norm(phrase))}(?![A-Za-z0-9'])`, 'i').test(norm(text));

function report(file, where, msg, isError = true) {
  if (isError) errors++;
  else warnings++;
  console.log(`${isError ? 'ERROR' : 'warn '} ${file} ${where}: ${msg}`);
}

function checkText(file, where, value, { bengali = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    report(file, where, 'must be a non-empty string');
    return false;
  }
  if (bengali && !BENGALI.test(value)) report(file, where, 'must contain Bengali text');
  if (!bengali && BENGALI.test(value)) report(file, where, 'must not contain Bengali text');
  return true;
}

function checkItem(file, level, type, where, item, index, seen) {
  const lim = LIMITS[level];
  const expectedId = String(index + 1).padStart(2, '0');
  if (item.id !== expectedId) report(file, where, `id should be "${expectedId}", got "${item.id}"`);
  if (!checkText(file, `${where}.en`, item.en)) return;
  const en = norm(item.en.trim());
  const key = en.toLowerCase();
  if (seen.has(key)) report(file, where, `duplicate sentence in track: "${en}"`);
  seen.add(key);
  if (BAD_CHARS.test(item.en)) report(file, where, `avoid symbols/curly quotes/emoji: "${item.en}"`);
  if (/\s{2,}/.test(item.en)) report(file, where, 'double spaces', false);

  const n = wordCount(en);
  if (type === 'paragraph') {
    const p = lim.para;
    if (!p) report(file, where, `paragraphs are not allowed at ${level}`);
    else {
      const sc = sentenceCount(en);
      if (sc < p.sentences[0] || sc > p.sentences[1]) report(file, where, `paragraph has ${sc} sentences, expected ${p.sentences.join('–')}`, false);
      if (n < p.words[0] || n > p.words[1]) report(file, where, `paragraph has ${n} words, expected ${p.words.join('–')}`, false);
    }
    checkText(file, `${where}.title`, item.title);
  } else {
    if (n < lim.words[0] - 1 || n > lim.words[1] + 3) report(file, where, `${n} words, expected ${lim.words.join('–')}: "${en}"`, false);
    const last = en.slice(-1);
    const isQ = ['yes-no-question', 'negative-question', 'wh-question', 'tag-question'].includes(type);
    if (isQ && last !== '?') report(file, where, `question must end with "?": "${en}"`);
    if (!isQ && type !== 'indirect-question' && !['.', '!'].includes(last)) report(file, where, `statement must end with "." or "!": "${en}"`);
    if (type === 'indirect-question' && !['.', '?'].includes(last)) report(file, where, `must end with "?" or ".": "${en}"`);
    if (type === 'affirmative') {
      if (HARD_NEG.test(en)) report(file, where, `positive statement contains a negation: "${en}"`);
      else if (NEGATION.test(en)) report(file, where, `positive statement may be negative: "${en}"`, false);
    }
    if (type === 'negative' && !NEGATION.test(en)) report(file, where, `negative statement has no negation: "${en}"`);
    if (type === 'yes-no-question' && !YES_NO_START.test(en)) report(file, where, `yes/no question should start with an auxiliary: "${en}"`);
    if (type === 'negative-question' && !(NEG_Q_START.test(en) || /^\w+\s+.*\bnot\b/i.test(en) || /^(why|how|what|where|who)\s+\w+n't\b/i.test(en))) {
      report(file, where, `negative question should start with a negative auxiliary: "${en}"`);
    }
    if (type === 'wh-question' && !WH_START.test(en)) report(file, where, `wh- question should start with a wh- word: "${en}"`);
    if (type === 'tag-question' && !/,\s*\w+(n't)?\s+\w+\?$/i.test(en) && !/,\s*\w+\s+\w+\s+\w+\?$/i.test(en)) {
      report(file, where, `tag question should end with a tag like ", isn't it?": "${en}"`);
    }
  }

  if (!item.bn) report(file, `${where}.bn`, 'missing full-sentence Bengali meaning');
  else {
    checkText(file, `${where}.bn`, item.bn, { bengali: true });
    const isQ = ['yes-no-question', 'negative-question', 'wh-question', 'tag-question'].includes(type);
    if (isQ && !item.bn.trim().endsWith('?')) report(file, `${where}.bn`, `question meaning should end with "?": "${item.bn}"`, false);
  }

  if (!Array.isArray(item.words) || item.words.length === 0) {
    report(file, `${where}.words`, 'needs at least one glossed word');
    return;
  }
  const g = type === 'paragraph' ? lim.para?.gloss ?? [1, 6] : lim.gloss;
  if (item.words.length < g[0] || item.words.length > g[1] + 1) report(file, `${where}.words`, `${item.words.length} glossed words, expected ${g.join('–')}`, false);
  const ws = new Set();
  item.words.forEach((w, i) => {
    const wWhere = `${where}.words[${i}]`;
    if (!checkText(file, `${wWhere}.w`, w.w)) return;
    if (ws.has(w.w.toLowerCase())) report(file, wWhere, `duplicate word "${w.w}"`);
    ws.add(w.w.toLowerCase());
    if (!containsPhrase(en, w.w)) report(file, wWhere, `"${w.w}" not found as a whole word in: "${en}"`);
    checkText(file, `${wWhere}.bn`, w.bn, { bengali: true });
    if (!POS.has(w.pos)) report(file, wWhere, `pos "${w.pos}" is not allowed`);
    if (w.base !== undefined) checkText(file, `${wWhere}.base`, w.base);
  });
}

function checkTrack(topic, level) {
  const file = `data/topics/${topic}/${level}.json`;
  const path = join(root, file);
  if (!existsSync(path)) {
    report(file, '', 'missing file', false);
    return;
  }
  let track;
  try {
    track = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    report(file, '', `invalid JSON: ${e.message}`);
    return;
  }
  totals.tracks++;
  if (track.topic !== topic) report(file, 'topic', `should be "${topic}"`);
  if (track.level !== level) report(file, 'level', `should be "${level}"`);
  checkText(file, 'title', track.title);
  checkText(file, 'story', track.story);
  checkText(file, 'storyBn', track.storyBn, { bengali: true });

  const blueprint = catalog.blueprint[level];
  const units = Array.isArray(track.units) ? track.units : [];
  if (units.length !== blueprint.length) report(file, 'units', `expected ${blueprint.length} units, got ${units.length}`);
  const seen = new Set();
  blueprint.forEach((bpUnit, ui) => {
    const unit = units[ui];
    const uWhere = `units[${ui}]`;
    if (!unit) return;
    if (unit.grammar !== bpUnit.grammar) report(file, `${uWhere}.grammar`, `expected "${bpUnit.grammar}", got "${unit.grammar}"`);
    checkText(file, `${uWhere}.focus`, unit.focus);
    checkText(file, `${uWhere}.focusBn`, unit.focusBn, { bengali: true });
    const bpSessions = Object.entries(bpUnit.sessions);
    const sessions = Array.isArray(unit.sessions) ? unit.sessions : [];
    if (sessions.length !== bpSessions.length) report(file, `${uWhere}.sessions`, `expected ${bpSessions.length} sessions, got ${sessions.length}`);
    bpSessions.forEach(([type, count], si) => {
      const s = sessions[si];
      const sWhere = `${uWhere}(${bpUnit.grammar}).sessions[${si}]`;
      if (!s) return;
      totals.sessions++;
      if (s.type !== type) report(file, `${sWhere}.type`, `expected "${type}", got "${s.type}"`);
      checkText(file, `${sWhere}.pattern`, s.pattern);
      checkText(file, `${sWhere}.tipBn`, s.tipBn, { bengali: true });
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length !== count) report(file, `${sWhere}.items`, `expected ${count} items, got ${items.length}`);
      items.forEach((item, ii) => {
        totals.items++;
        checkItem(file, level, type, `${sWhere}(${type}).items[${ii}]`, item, ii, seen);
      });
    });
  });
}

const topicDir = join(root, 'data/topics');
const known = catalog.topics.map((t) => t.id);
for (const dir of existsSync(topicDir) ? readdirSync(topicDir) : []) {
  if (!known.includes(dir)) report(`data/topics/${dir}`, '', 'topic folder is not listed in catalog.json');
}
for (const topic of known) {
  if (onlyTopics.length && !onlyTopics.includes(topic)) continue;
  for (const level of catalog.levels.map((l) => l.id)) checkTrack(topic, level);
}

console.log(`\n${totals.tracks} tracks, ${totals.sessions} sessions, ${totals.items} items — ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
