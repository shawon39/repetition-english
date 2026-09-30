import { CalendarClock, ChartColumn, House, Library, Repeat2, Settings as SettingsIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { catalog, getLevel } from '../lib/content';
import { dayKey, isDue } from '../lib/srs';
import { useStore } from '../lib/store';
import type { LevelId } from '../lib/types';
import { Bn, ProgressBar } from './ui';

export function Layout() {
  const { state, settings, updateSettings } = useStore();
  const due = Object.values(state.sessions).filter((s) => isDue(s)).length;
  const today = state.days[dayKey()] ?? 0;
  const level = getLevel(settings.level);

  const nav = [
    { to: '/', label: 'Today', icon: House, end: true },
    { to: '/library', label: 'Library', icon: Library },
    { to: '/review', label: 'Review', icon: CalendarClock, badge: due },
    { to: '/progress', label: 'Progress', icon: ChartColumn },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Repeat2 size={20} strokeWidth={2.4} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Repetition</span>
            <span className="brand-sub">English</span>
          </span>
        </NavLink>

        <nav className="nav">
          {nav.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              {!!badge && <span className="nav-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="side-card">
            <div className="side-card-row">
              <span className="eyebrow">Today</span>
              <span className="side-num">
                {today}
                <small> / {settings.dailyGoal} reps</small>
              </span>
            </div>
            <ProgressBar value={today} max={settings.dailyGoal} tone="rep" />
          </div>

          <label className="side-card level-picker">
            <span className="eyebrow">My level</span>
            <select value={settings.level} onChange={(e) => updateSettings({ level: e.target.value as LevelId })}>
              {catalog.levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} · {l.cefr}
                </option>
              ))}
            </select>
            {settings.showBangla && <Bn className="muted small">{level.titleBn}</Bn>}
          </label>

          <label className="bangla-switch">
            <input
              type="checkbox"
              role="switch"
              checked={settings.showBangla}
              onChange={(e) => updateSettings({ showBangla: e.target.checked })}
            />
            <span className="toggle-track" aria-hidden />
            <span>
              Show <Bn>বাংলা</Bn>
            </span>
          </label>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
