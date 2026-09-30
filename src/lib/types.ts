export type LevelId = 'starter' | 'elementary' | 'intermediate' | 'advanced';

export type SessionType =
  | 'affirmative'
  | 'negative'
  | 'yes-no-question'
  | 'negative-question'
  | 'wh-question'
  | 'tag-question'
  | 'indirect-question'
  | 'paragraph';

export interface Gloss {
  w: string;
  bn: string;
  pos: string;
  base?: string;
}

export interface Item {
  id: string;
  en: string;
  title?: string;
  words: Gloss[];
}

export interface Session {
  type: SessionType;
  pattern: string;
  tipBn: string;
  items: Item[];
}

export interface Unit {
  grammar: string;
  focus: string;
  focusBn: string;
  sessions: Session[];
}

export interface Track {
  topic: string;
  level: LevelId;
  title: string;
  story: string;
  storyBn: string;
  units: Unit[];
}

export interface LevelInfo {
  id: LevelId;
  title: string;
  titleBn: string;
  cefr: string;
  targetReps: number;
  description: string;
  descriptionBn: string;
}

export interface TopicInfo {
  id: string;
  title: string;
  titleBn: string;
  icon: string;
  description: string;
}

export interface Label {
  title: string;
  titleBn: string;
  short?: string;
}

export interface Catalog {
  levels: LevelInfo[];
  topics: TopicInfo[];
  grammar: Record<string, Label>;
  sessionTypes: Record<SessionType, Label & { short: string }>;
}

export type PracticeMode = 'read' | 'speak' | 'type';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  level: LevelId;
  showBangla: boolean;
  fade: boolean;
  mode: PracticeMode;
  dailyGoal: number;
  strict: boolean;
  paceGuard: boolean;
  autoListen: boolean;
  voice: string | null;
  rate: number;
  theme: Theme;
}

export interface ItemStat {
  reps: number;
  last: number;
}

export interface SessionStat {
  completions: number;
  lastCompleted: number;
  box: number;
  due: number;
}

/** An unfinished run through a session, so the learner can resume it. */
export interface Attempt {
  counts: number[];
  index: number;
  startedAt: number;
  updatedAt: number;
}

export interface ProgressState {
  v: 1;
  items: Record<string, ItemStat>;
  sessions: Record<string, SessionStat>;
  attempts: Record<string, Attempt>;
  days: Record<string, number>;
  settings: Settings;
}
