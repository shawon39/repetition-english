import { getLevel, sessionItemKeys, sessionRefs, type SessionRef } from './content';
import { isDue, mastery, type Mastery } from './srs';
import type { ProgressState, Track } from './types';

/** Items in a session that reached the target count at least once. */
export function sessionDone(state: ProgressState, ref: SessionRef) {
  const target = ref.level.targetReps;
  const keys = sessionItemKeys(ref.key, ref.session);
  return keys.filter((k) => (state.items[k]?.reps ?? 0) >= target).length;
}

export type SessionStatus = 'new' | 'in-progress' | 'done' | 'due';

export function sessionStatus(state: ProgressState, ref: SessionRef): SessionStatus {
  const stat = state.sessions[ref.key];
  if (stat && isDue(stat)) return 'due';
  if (stat) return 'done';
  if (state.attempts[ref.key]) return 'in-progress';
  return 'new';
}

export function trackProgress(state: ProgressState, track: Track) {
  const refs = sessionRefs(track);
  const target = getLevel(track.level).targetReps;
  const counts: Record<Mastery, number> = { new: 0, learning: 0, familiar: 0, strong: 0, mastered: 0 };
  let items = 0;
  let reps = 0;
  for (const ref of refs) {
    for (const key of sessionItemKeys(ref.key, ref.session)) {
      const stat = state.items[key];
      counts[mastery(stat, target)]++;
      reps += stat?.reps ?? 0;
      items++;
    }
  }
  const completed = refs.filter((r) => state.sessions[r.key]).length;
  const due = refs.filter((r) => isDue(state.sessions[r.key])).length;
  const next = refs.find((r) => state.attempts[r.key]) ?? refs.find((r) => !state.sessions[r.key]) ?? refs[0];
  return {
    sessions: refs.length,
    completed,
    due,
    items,
    reps,
    mastery: counts,
    percent: refs.length ? Math.round((completed / refs.length) * 100) : 0,
    next,
  };
}
