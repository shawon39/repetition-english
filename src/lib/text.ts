import type { Gloss } from './types';

export interface Token {
  text: string;
  /** Index among word tokens, or -1 for spaces and punctuation. */
  word: number;
}

export type Chunk =
  | { kind: 'text'; tokens: Token[] }
  | { kind: 'gloss'; gloss: Gloss; tokens: Token[] };

const WORD_RE = /[A-Za-z0-9]+(?:['’][A-Za-z]+)*(?:[-:][A-Za-z0-9]+)*/g;
const lower = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let word = 0;
  for (const m of text.matchAll(WORD_RE)) {
    if (m.index! > last) tokens.push({ text: text.slice(last, m.index), word: -1 });
    tokens.push({ text: m[0], word: word++ });
    last = m.index! + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), word: -1 });
  return tokens;
}

/** Groups tokens so every glossed word or phrase becomes one clickable chunk. */
export function chunkSentence(tokens: Token[], glosses: Gloss[]): Chunk[] {
  const words = tokens.filter((t) => t.word >= 0);
  const owner: (Gloss | undefined)[] = new Array(words.length);
  const sorted = [...glosses].sort((a, b) => b.w.split(/\s+/).length - a.w.split(/\s+/).length);
  for (const gloss of sorted) {
    const parts = [...gloss.w.matchAll(WORD_RE)].map((m) => lower(m[0]));
    if (!parts.length) continue;
    for (let i = 0; i + parts.length <= words.length; i++) {
      const hit = parts.every((p, j) => !owner[i + j] && lower(words[i + j].text) === p);
      if (hit) {
        for (let j = 0; j < parts.length; j++) owner[i + j] = gloss;
        break;
      }
    }
  }

  const chunks: Chunk[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const g = t.word >= 0 ? owner[t.word] : undefined;
    if (g) {
      const group: Token[] = [t];
      let j = i + 1;
      // Pull in following tokens while they belong to the same phrase.
      while (j < tokens.length) {
        const n = tokens[j];
        if (n.word >= 0 && owner[n.word] === g) group.push(n);
        else if (n.word < 0 && /^\s+$/.test(n.text) && tokens[j + 1]?.word >= 0 && owner[tokens[j + 1].word] === g) group.push(n);
        else break;
        j++;
      }
      chunks.push({ kind: 'gloss', gloss: g, tokens: group });
      i = j;
    } else {
      const prev = chunks[chunks.length - 1];
      if (prev?.kind === 'text') prev.tokens.push(t);
      else chunks.push({ kind: 'text', tokens: [t] });
      i++;
    }
  }
  return chunks;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order in which words disappear during Memory Fade: glossed words first,
 * then longer content words, then the rest. Stable per item.
 */
export function fadeOrder(tokens: Token[], glosses: Gloss[], seed: string): number[] {
  const glossed = new Set<number>();
  for (const c of chunkSentence(tokens, glosses)) {
    if (c.kind === 'gloss') c.tokens.forEach((t) => t.word >= 0 && glossed.add(t.word));
  }
  const rand = rng(hash(seed));
  return tokens
    .filter((t) => t.word >= 0)
    .map((t) => ({
      w: t.word,
      score: (glossed.has(t.word) ? 2 : 0) + (t.text.length >= 4 ? 1 : 0) + rand(),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.w);
}

/**
 * Fraction of words hidden after `done` reps out of `target`. It climbs from
 * `start` to 1 on the last rep, and drops back to 0 once the target is met.
 */
export function fadeFraction(done: number, target: number, start = 0) {
  if (done >= target) return 0;
  return start + (1 - start) * (target > 1 ? done / (target - 1) : 1);
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberToWords(n % 100)}` : ''}`;
  if (n < 1_000_000) return `${numberToWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberToWords(n % 1000)}` : ''}`;
  return String(n);
}

/** Lowercase word list with contractions expanded and numbers spelled out. */
export function normalizeWords(s: string): string[] {
  const t = lower(s)
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b|\bcannot\b/g, 'can not')
    .replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are')
    .replace(/'m\b/g, ' am')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'d\b/g, ' would')
    .replace(/\blet's\b/g, 'let us')
    .replace(/\b(it|that|there|what|where|who|how|he|she|here|when|why)'s\b/g, '$1 is')
    .replace(/(\d+):(\d+)/g, '$1 $2')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/'/g, '');
  return t
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (/^\d+$/.test(w) ? numberToWords(Number(w)).split(' ') : [w]));
}

/** Longest common subsequence alignment. Returns which words on each side matched. */
export function align(target: string[], said: string[]) {
  const m = target.length;
  const n = said.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = target[i] === said[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const targetHit = new Array<boolean>(m).fill(false);
  const saidHit = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (target[i] === said[j]) {
      targetHit[i] = saidHit[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { score: m ? dp[0][0] / m : 0, targetHit, saidHit, exact: dp[0][0] === m && m === n };
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Rough time to say a text aloud at a learner's pace, in ms. */
export function speakingTime(text: string) {
  return Math.min(20000, Math.max(1100, wordCount(text) * 380));
}
