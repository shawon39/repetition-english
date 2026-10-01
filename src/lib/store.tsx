import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { completeSession, dayKey } from './srs';
import type { Attempt, ProgressState, Settings } from './types';

const STORAGE_KEY = 'repetition-english:v1';

export const DEFAULT_SETTINGS: Settings = {
  level: 'starter',
  showMeaning: false,
  fade: true,
  mode: 'read',
  dailyGoal: 100,
  strict: true,
  paceGuard: true,
  autoListen: true,
  voice: null,
  rate: 0.9,
  theme: 'system',
};

const empty = (): ProgressState => ({
  v: 1,
  items: {},
  sessions: {},
  attempts: {},
  days: {},
  settings: { ...DEFAULT_SETTINGS },
});

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...empty(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch {
    return empty();
  }
}

interface Store {
  state: ProgressState;
  settings: Settings;
  rep: (itemKey: string) => void;
  saveAttempt: (sessionKey: string, attempt: Attempt | null) => void;
  complete: (sessionKey: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
  importState: (data: ProgressState) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked. Progress then lasts for this tab only.
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const rep = useCallback((itemKey: string) => {
    const now = Date.now();
    const day = dayKey(now);
    setState((s) => ({
      ...s,
      items: { ...s.items, [itemKey]: { reps: (s.items[itemKey]?.reps ?? 0) + 1, last: now } },
      days: { ...s.days, [day]: (s.days[day] ?? 0) + 1 },
    }));
  }, []);

  const saveAttempt = useCallback((sessionKey: string, attempt: Attempt | null) => {
    setState((s) => {
      const attempts = { ...s.attempts };
      if (attempt) attempts[sessionKey] = attempt;
      else delete attempts[sessionKey];
      return { ...s, attempts };
    });
  }, []);

  const complete = useCallback((sessionKey: string) => {
    setState((s) => {
      const attempts = { ...s.attempts };
      delete attempts[sessionKey];
      return { ...s, attempts, sessions: { ...s.sessions, [sessionKey]: completeSession(s.sessions[sessionKey]) } };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const reset = useCallback(() => setState((s) => ({ ...empty(), settings: s.settings })), []);
  const importState = useCallback((data: ProgressState) => {
    setState({ ...empty(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
  }, []);

  const value = useMemo(
    () => ({ state, settings: state.settings, rep, saveAttempt, complete, updateSettings, reset, importState }),
    [state, rep, saveAttempt, complete, updateSettings, reset, importState],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
