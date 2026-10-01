import { Settings as SettingsIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getLevel } from '../lib/content';
import { isDue } from '../lib/srs';
import { useStore } from '../lib/store';
import { Mark } from './ui';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/topics', label: 'Topics' },
  { to: '/review', label: 'Review' },
  { to: '/progress', label: 'Progress' },
];

export function Layout() {
  const { state, settings } = useStore();
  const due = Object.values(state.sessions).some((s) => isDue(s));
  const level = getLevel(settings.level);
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="nav">
        <Link to="/" className="brand" aria-label="Repetition, home">
          <Mark />
          repetition
        </Link>
        <nav className="nav-links">
          {LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive || (to === '/topics' && pathname.startsWith('/topic/')) ? ' active' : ''}`}>
              {label}
              {label === 'Review' && due && <span className="due-dot" aria-label="Reviews due" />}
            </NavLink>
          ))}
        </nav>
        <div className="nav-end">
          <Link to="/topics" className="level-pill">
            {level.title} · {level.cefr}
          </Link>
          <Link to="/settings" className="icon-btn" aria-label="Settings">
            <SettingsIcon size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
