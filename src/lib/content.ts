import catalogJson from '../../data/catalog.json';
import type { Catalog, Item, LevelId, LevelInfo, Session, TopicInfo, Track, Unit } from './types';

export const catalog = catalogJson as unknown as Catalog;

const modules = import.meta.glob<Track>('../../data/topics/*/*.json', { eager: true, import: 'default' });

const tracks = new Map<string, Track>();
for (const track of Object.values(modules)) {
  tracks.set(`${track.topic}/${track.level}`, track);
}

export const levelIds = catalog.levels.map((l) => l.id);

export function getLevel(id: string): LevelInfo {
  return catalog.levels.find((l) => l.id === id) ?? catalog.levels[0];
}

export function getTopic(id: string): TopicInfo | undefined {
  return catalog.topics.find((t) => t.id === id);
}

export function getTrack(topic: string, level: string): Track | undefined {
  return tracks.get(`${topic}/${level}`);
}

export function grammarLabel(id: string) {
  return catalog.grammar[id] ?? { title: id, titleBn: id };
}

export function typeLabel(type: Session['type']) {
  return catalog.sessionTypes[type];
}

export const trackKey = (topic: string, level: string) => `${topic}/${level}`;
export const sessionKey = (topic: string, level: string, grammar: string, type: string) =>
  `${topic}/${level}/${grammar}/${type}`;
export const itemKey = (sKey: string, id: string) => `${sKey}/${id}`;

export interface SessionRef {
  key: string;
  topic: TopicInfo;
  level: LevelInfo;
  track: Track;
  unit: Unit;
  session: Session;
  unitIndex: number;
  sessionIndex: number;
}

export function sessionRefs(track: Track): SessionRef[] {
  const topic = getTopic(track.topic)!;
  const level = getLevel(track.level);
  return track.units.flatMap((unit, unitIndex) =>
    unit.sessions.map((session, sessionIndex) => ({
      key: sessionKey(track.topic, track.level, unit.grammar, session.type),
      topic,
      level,
      track,
      unit,
      session,
      unitIndex,
      sessionIndex,
    })),
  );
}

export function findSession(key: string): SessionRef | undefined {
  const [topic, level] = key.split('/');
  const track = getTrack(topic, level);
  return track ? sessionRefs(track).find((r) => r.key === key) : undefined;
}

export function nextSessionRef(key: string): SessionRef | undefined {
  const ref = findSession(key);
  if (!ref) return undefined;
  const refs = sessionRefs(ref.track);
  return refs[refs.findIndex((r) => r.key === key) + 1];
}

export function sessionItemKeys(key: string, session: Session) {
  return session.items.map((it: Item) => itemKey(key, it.id));
}

export function trackStats(track: Track) {
  const refs = sessionRefs(track);
  const items = refs.reduce((n, r) => n + r.session.items.length, 0);
  return { sessions: refs.length, items, units: track.units.length };
}

export function practicePath(key: string, extra = '') {
  return `/practice/${key}${extra}`;
}

export function allTracks(): Track[] {
  return [...tracks.values()];
}

export function levelTracks(level: LevelId): Track[] {
  return catalog.topics.map((t) => getTrack(t.id, level)).filter((t): t is Track => !!t);
}
