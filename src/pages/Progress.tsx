import { motion } from 'motion/react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { catalog, levelTracks } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { dayKey, streak } from '../lib/srs';
import { useStore } from '../lib/store';
import { Line, Page, rise, stagger } from '../components/ui';

const CELL = 18; // 14px square + 4px gap

export function Progress() {
  const { state, settings } = useStore();
  const total = Object.values(state.days).reduce((a, b) => a + b, 0);
  const days = streak(state.days);

  const mastered = useMemo(
    () => catalog.levels.reduce((n, l) => n + levelTracks(l.id).reduce((m, t) => m + trackProgress(state, t).mastery.mastered, 0), 0),
    [state],
  );

  const byTopic = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const [key, stat] of Object.entries(state.items)) sums[key.split('/')[0]] = (sums[key.split('/')[0]] ?? 0) + stat.reps;
    return catalog.topics.map((t) => ({ topic: t, reps: sums[t.id] ?? 0 })).sort((a, b) => b.reps - a.reps);
  }, [state.items]);
  const max = Math.max(1, ...byTopic.map((t) => t.reps));

  return (
    <Page>
      <h1 className="title">Progress</h1>

      <motion.div className="figures" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise}>
          <span className="figure">{total.toLocaleString()}</span>
          <span className="small muted">total reps</span>
        </motion.div>
        <motion.div variants={rise}>
          <span className="figure">{days}</span>
          <span className="small muted">day streak</span>
        </motion.div>
        <motion.div variants={rise}>
          <span className="figure">{mastered}</span>
          <span className="small muted">sentences mastered</span>
        </motion.div>
      </motion.div>

      <section className="heatmap-wrap">
        <h2 className="section-title">Every day you practised</h2>
        <Heatmap days={state.days} goal={settings.dailyGoal} />
      </section>

      <section className="bars">
        <h2 className="section-title">Reps by topic</h2>
        {byTopic.map(({ topic, reps }) => (
          <div key={topic.id} className="bar-row">
            <span>{topic.title}</span>
            <Line value={reps} max={max} />
            <span className="num">{reps.toLocaleString()}</span>
          </div>
        ))}
      </section>
    </Page>
  );
}

function bucket(reps: number, goal: number) {
  if (!reps) return 0;
  const r = reps / goal;
  return r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4;
}

function Heatmap({ days, goal }: { days: Record<string, number>; goal: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(40);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  // Show as many weeks as fit, up to a year.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setWeeks(Math.max(12, Math.min(53, Math.floor(el.clientWidth / CELL))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date);
      return { key, date, reps: days[key] ?? 0, future: date > today };
    }),
  );

  return (
    <div ref={wrap} onMouseLeave={() => setHover(null)}>
      <div className="heatmap">
        {cols.map((col, ci) => (
          <motion.div
            key={ci}
            className="heat-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: ci * 0.008 }}
          >
            {col.map((c) => (
              <span
                key={c.key}
                className={`heat ${c.future ? 'future' : `h${bucket(c.reps, goal)}`}`}
                onMouseEnter={(e) => {
                  if (c.future) return;
                  const box = wrap.current!.getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover({
                    x: r.left - box.left + r.width / 2,
                    y: r.top - box.top,
                    label: `${c.reps} reps · ${c.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
                  });
                }}
              />
            ))}
          </motion.div>
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
