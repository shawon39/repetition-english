import type { ItemStat, SessionStat } from './types';

const DAY = 24 * 60 * 60 * 1000;

/** Days until the next repetition, indexed by box. */
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MAX_BOX = INTERVALS.length - 1;

export function dayKey(t: number | Date = Date.now()) {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function endOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function completeSession(stat: SessionStat | undefined, now = Date.now()): SessionStat {
  if (!stat) return { completions: 1, lastCompleted: now, box: 1, due: now + INTERVALS[1] * DAY };
  // Practising early keeps the box; practising on time moves it up.
  const box = isDue(stat, now) ? Math.min(MAX_BOX, stat.box + 1) : stat.box;
  return { completions: stat.completions + 1, lastCompleted: now, box, due: now + INTERVALS[box] * DAY };
}

export const isDue = (stat: SessionStat | undefined, now = Date.now()) => !!stat && stat.due <= endOfDay(now);

export function dueLabel(stat: SessionStat, now = Date.now()) {
  const days = Math.round((endOfDay(stat.due) - endOfDay(now)) / DAY);
  if (days < 0) return days === -1 ? 'Overdue by 1 day' : `Overdue by ${-days} days`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export type Mastery = 'new' | 'learning' | 'familiar' | 'strong' | 'mastered';

export const MASTERY: { id: Mastery; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Not repeated yet' },
  { id: 'learning', label: 'Learning', hint: 'Less than 2 full rounds' },
  { id: 'familiar', label: 'Familiar', hint: '2–3 rounds' },
  { id: 'strong', label: 'Strong', hint: '4–5 rounds' },
  { id: 'mastered', label: 'Mastered', hint: '6 or more rounds' },
];

export function mastery(stat: ItemStat | undefined, target: number): Mastery {
  const reps = stat?.reps ?? 0;
  if (!reps) return 'new';
  const rounds = reps / target;
  if (rounds < 2) return 'learning';
  if (rounds < 4) return 'familiar';
  if (rounds < 6) return 'strong';
  return 'mastered';
}

export function streak(days: Record<string, number>, now = Date.now()) {
  let n = 0;
  let t = now;
  if (!days[dayKey(t)]) t -= DAY;
  while (days[dayKey(t)]) {
    n++;
    t -= DAY;
  }
  return n;
}
