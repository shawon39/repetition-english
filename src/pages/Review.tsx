import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { findSession, grammarLabel, practicePath, typeLabel } from '../lib/content';
import { dueLabel, endOfDay, isDue } from '../lib/srs';
import { useStore } from '../lib/store';
import { Page, TopicIcon, rise, stagger } from '../components/ui';

const DAY = 24 * 60 * 60 * 1000;

export function Review() {
  const { state } = useStore();
  const rows = Object.entries(state.sessions)
    .map(([key, stat]) => ({ ref: findSession(key)!, stat }))
    .filter((r) => r.ref)
    .sort((a, b) => a.stat.due - b.stat.due);
  const due = rows.filter((r) => isDue(r.stat));
  const soon = rows.filter((r) => !isDue(r.stat) && r.stat.due <= endOfDay() + 7 * DAY);

  const list = (items: typeof rows, isDueList: boolean) => (
    <motion.div className="rows" variants={stagger} initial="hidden" animate="show">
      {items.map(({ ref, stat }) => (
        <motion.div key={ref.key} variants={rise}>
          <Link to={practicePath(ref.key, isDueList ? '?review=1' : '')} className="row">
            <TopicIcon icon={ref.topic.icon} size={18} />
            <span className="row-main">
              <span className="row-title">
                {ref.topic.title} · {typeLabel(ref.session.type).title}
              </span>
              <span className="small muted">
                {ref.level.title} · {grammarLabel(ref.unit.grammar).title}
              </span>
            </span>
            <span className={`row-when${isDueList ? ' is-due' : ''}`}>{dueLabel(stat)}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <Page>
      <div className="page-head">
        <div>
          <h1 className="title">Review</h1>
          <p className="lede">Finished sessions come back after 1, 3, 7, 14, 30 and 60 days, so they move into long-term memory.</p>
        </div>
        {due.length > 0 && (
          <Link to={practicePath(due[0].ref.key, '?review=1')} className="btn btn-primary">
            Start review <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {due.length ? (
        list(due, true)
      ) : (
        <p className="empty">{rows.length ? 'Nothing is due today.' : 'Finish a session and it will come back here tomorrow.'}</p>
      )}

      {soon.length > 0 && (
        <>
          <h2 className="section-title">This week</h2>
          {list(soon, false)}
        </>
      )}
    </Page>
  );
}
