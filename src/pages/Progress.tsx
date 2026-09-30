import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { catalog, findSession, getLevel, getTopic, levelTracks } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { MASTERY, dayKey, streak, type Mastery } from '../lib/srs';
import { useStore } from '../lib/store';
import { TopicIcon } from '../components/ui';


export function Progress() {
  const { state, settings } = useStore();
  const level = getLevel(settings.level);
  const total = Object.values(state.days).reduce((a, b) => a + b, 0);
  const today = state.days[dayKey()] ?? 0;
  const best = Math.max(0, ...Object.values(state.days));
  const days = streak(state.days);
  const activeDays = Object.values(state.days).filter(Boolean).length;

  const byTopic = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const [key, stat] of Object.entries(state.items)) {
      const topic = key.split('/')[0];
      sums[topic] = (sums[topic] ?? 0) + stat.reps;
    }
    return catalog.topics.map((t) => ({ topic: t, reps: sums[t.id] ?? 0 }));
  }, [state.items]);
  const maxTopic = Math.max(1, ...byTopic.map((t) => t.reps));

  const masteryCounts = useMemo(() => {
    const counts: Record<Mastery, number> = { new: 0, learning: 0, familiar: 0, strong: 0, mastered: 0 };
    for (const track of levelTracks(level.id)) {
      const m = trackProgress(state, track).mastery;
      for (const k of Object.keys(counts) as Mastery[]) counts[k] += m[k];
    }
    return counts;
  }, [state, level.id]);
  const masteryTotal = Object.values(masteryCounts).reduce((a, b) => a + b, 0);

  const top = Object.entries(state.items)
    .sort((a, b) => b[1].reps - a[1].reps)
    .slice(0, 8)
    .map(([key, stat]) => {
      const parts = key.split('/');
      const ref = findSession(parts.slice(0, 4).join('/'));
      const item = ref?.session.items.find((i) => i.id === parts[4]);
      return { key, stat, ref, item };
    })
    .filter((x) => x.item);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Progress</p>
          <h1>Every rep counts</h1>
          <p className="lede">A rep is one time you said, typed or recalled a sentence.</p>
        </div>
      </header>

      <section className="kpis">
        <div className="card kpi kpi-hero">
          <span className="kpi-label">Total reps</span>
          <span className="kpi-value">{total.toLocaleString()}</span>
          <span className="kpi-sub">across {activeDays} active {activeDays === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Today</span>
          <span className="kpi-value">{today}</span>
          <span className="kpi-sub">goal {settings.dailyGoal}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Streak</span>
          <span className="kpi-value">{days}</span>
          <span className="kpi-sub">{days === 1 ? 'day' : 'days'} in a row</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Best day</span>
          <span className="kpi-value">{best}</span>
          <span className="kpi-sub">reps</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Mastered</span>
          <span className="kpi-value">{masteryCounts.mastered}</span>
          <span className="kpi-sub">sentences at {level.title}</span>
        </div>
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <div>
            <h2>Daily reps</h2>
            <p className="muted small">One square per day. Darker means more reps compared with your daily goal.</p>
          </div>
          <HeatLegend />
        </div>
        <Heatmap days={state.days} goal={settings.dailyGoal} />
      </section>

      <div className="two-col">
        <section className="card chart-card">
          <div className="chart-head">
            <div>
              <h2>Mastery at {level.title}</h2>
              <p className="muted small">{masteryTotal} sentences. One round = {level.targetReps} reps.</p>
            </div>
          </div>
          <div className="stack" role="img" aria-label="Mastery distribution">
            {MASTERY.map((m) =>
              masteryCounts[m.id] ? (
                <span
                  key={m.id}
                  className={`stack-seg m-${m.id}`}
                  style={{ flexGrow: masteryCounts[m.id] }}
                  title={`${m.label}: ${masteryCounts[m.id]} sentences`}
                />
              ) : null,
            )}
          </div>
          <ul className="legend">
            {MASTERY.map((m) => (
              <li key={m.id}>
                <span className={`swatch m-${m.id}`} />
                <span>{m.label}</span>
                <b>{masteryCounts[m.id]}</b>
                <span className="muted small">{m.hint}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card chart-card">
          <div className="chart-head">
            <div>
              <h2>Reps by topic</h2>
              <p className="muted small">All levels</p>
            </div>
          </div>
          <ul className="hbars">
            {byTopic.map(({ topic, reps }) => (
              <li key={topic.id} title={`${topic.title}: ${reps} reps`}>
                <span className="hbar-label">
                  <TopicIcon topic={topic.id} icon={getTopic(topic.id)!.icon} size={26} />
                  {topic.title}
                </span>
                <span className="hbar-track">
                  <span className="hbar-fill" style={{ width: `${(reps / maxTopic) * 100}%` }} />
                  <span className="hbar-value">{reps.toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card chart-card">
        <div className="chart-head">
          <h2>Most repeated</h2>
        </div>
        {top.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Sentence</th>
                <th>Topic</th>
                <th className="num">Reps</th>
              </tr>
            </thead>
            <tbody>
              {top.map(({ key, stat, ref, item }) => (
                <tr key={key}>
                  <td>{item!.title ?? item!.en}</td>
                  <td className="muted">
                    {ref!.topic.title} · {ref!.level.title}
                  </td>
                  <td className="num">{stat.reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-note">Your most repeated sentences will show here.</p>
        )}
      </section>
    </div>
  );
}

function bucket(reps: number, goal: number) {
  if (!reps) return 0;
  const r = reps / goal;
  return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 1 ? 3 : r < 1.5 ? 4 : 5;
}

function HeatLegend() {
  return (
    <span className="heat-legend">
      Less
      {[0, 1, 2, 3, 4, 5].map((b) => (
        <span key={b} className={`heat-cell h${b}`} />
      ))}
      More
    </span>
  );
}

const CELL = 20; // 16px square + 4px gap

function Heatmap({ days, goal }: { days: Record<string, number>; goal: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [WEEKS, setWeeks] = useState(40);
  // Show as many weeks as fit the card, up to a year.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setWeeks(Math.max(12, Math.min(53, Math.floor((el.clientWidth - 40) / CELL))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Columns are weeks starting on Sunday; the last column is the current week.
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dayKey(date);
    return { key, date, reps: days[key] ?? 0, future: date > today };
  });
  const weeks: (typeof cells)[] = [];
  cells.forEach((c, i) => (weeks[Math.floor(i / 7)] ??= []).push(c));

  return (
    <div ref={wrap} className="heatmap-wrap" onMouseLeave={() => setHover(null)}>
      <div className="heat-days">
        <span />
        <span>Mon</span>
        <span />
        <span>Wed</span>
        <span />
        <span>Fri</span>
        <span />
      </div>
      <div className="heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="heat-col">
            <span className="heat-month">
              {week[0].date.getDate() <= 7 ? week[0].date.toLocaleDateString('en-GB', { month: 'short' }) : ''}
            </span>
            {week.map((c) => (
              <span
                key={c.key}
                className={`heat-cell h${c.future ? 'x' : bucket(c.reps, goal)}`}
                onMouseEnter={(e) => {
                  if (c.future) return;
                  const box = (e.currentTarget.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover({
                    x: r.left - box.left + r.width / 2,
                    y: r.top - box.top,
                    label: `${c.reps} reps · ${c.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
                  });
                }}
              />
            ))}
          </div>
        ))}
        {hover && (
          <span className="tooltip" style={{ left: hover.x, top: hover.y }}>
            {hover.label}
          </span>
        )}
      </div>
    </div>
  );
}
