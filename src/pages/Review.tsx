import { ArrowRight, CalendarClock, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { findSession, grammarLabel, practicePath } from '../lib/content';
import { INTERVALS, dueLabel, endOfDay, isDue } from '../lib/srs';
import { useStore } from '../lib/store';
import { TopicIcon, TypeChip, topicStyle } from '../components/ui';

const DAY = 24 * 60 * 60 * 1000;

export function Review() {
  const { state } = useStore();
  const rows = Object.entries(state.sessions)
    .map(([key, stat]) => ({ ref: findSession(key), stat }))
    .filter((r) => r.ref)
    .sort((a, b) => a.stat.due - b.stat.due);
  const due = rows.filter((r) => isDue(r.stat));
  const week = rows.filter((r) => !isDue(r.stat) && r.stat.due <= endOfDay() + 7 * DAY);
  const later = rows.filter((r) => r.stat.due > endOfDay() + 7 * DAY);

  const Row = ({ r, cta }: { r: (typeof rows)[number]; cta: boolean }) => (
    <Link to={practicePath(r.ref!.key, cta ? '?review=1' : '')} className="review-row" style={topicStyle(r.ref!.topic.id)}>
      <TopicIcon topic={r.ref!.topic.id} icon={r.ref!.topic.icon} size={36} />
      <span className="review-main">
        <b>
          {r.ref!.topic.title} · {grammarLabel(r.ref!.unit.grammar).title}
        </b>
        <span className="muted small">
          {r.ref!.level.title} · {r.ref!.session.items.length} sentences · done {r.stat.completions}×
        </span>
      </span>
      <TypeChip type={r.ref!.session.type} />
      <span className="box-steps" title={`Step ${r.stat.box} of ${INTERVALS.length - 1}`}>
        {INTERVALS.slice(1).map((_, i) => (
          <span key={i} className={i < r.stat.box ? 'on' : ''} />
        ))}
      </span>
      <span className={`due-when${cta ? ' is-due' : ''}`}>{dueLabel(r.stat)}</span>
      <ArrowRight size={16} className="muted" />
    </Link>
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Review</p>
          <h1>Spaced repetition</h1>
          <p className="lede">
            A finished session comes back after 1, 3, 7, 14, 30 and 60 days. Each on-time review moves it one step further.
            Reviews start with words already fading.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>
            <CalendarClock size={20} /> Due now <span className="count">{due.length}</span>
          </h2>
          {due.length > 0 && (
            <Link to={practicePath(due[0].ref!.key, '?review=1')} className="btn btn-primary">
              Start first review <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {due.length ? (
          <div className="review-list">{due.map((r) => <Row key={r.ref!.key} r={r} cta />)}</div>
        ) : (
          <div className="empty card">
            <CalendarCheck size={28} />
            <p>
              <b>All caught up.</b> {rows.length ? 'Nothing is due today.' : 'Finish your first session and it will appear here tomorrow.'}
            </p>
          </div>
        )}
      </section>

      {week.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Next 7 days <span className="count">{week.length}</span></h2>
          </div>
          <div className="review-list">{week.map((r) => <Row key={r.ref!.key} r={r} cta={false} />)}</div>
        </section>
      )}

      {later.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Later <span className="count">{later.length}</span></h2>
          </div>
          <div className="review-list">{later.map((r) => <Row key={r.ref!.key} r={r} cta={false} />)}</div>
        </section>
      )}
    </div>
  );
}
