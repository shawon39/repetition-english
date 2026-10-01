import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { findSession, grammarLabel, levelTracks, practicePath } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { dayKey, isDue } from '../lib/srs';
import { useStore } from '../lib/store';
import { Bn, Line, Page, rise, stagger } from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home() {
  const { state, settings } = useStore();
  const tracks = levelTracks(settings.level);
  const today = state.days[dayKey()] ?? 0;
  const due = Object.values(state.sessions).filter((s) => isDue(s)).length;

  const resume = Object.entries(state.attempts)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([key, attempt]) => ({ ref: findSession(key), attempt }))
    .find((x) => x.ref);
  const ref = resume?.ref ?? (tracks.length ? trackProgress(state, tracks[0]).next : undefined);
  const index = resume ? Math.min(resume.attempt.index, (ref?.session.items.length ?? 1) - 1) : 0;
  const item = ref?.session.items[index];

  return (
    <Page>
      <motion.div className="page-head" variants={stagger} initial="hidden" animate="show">
        <div>
          <motion.span variants={rise} className="small muted">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}, {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
          </motion.span>
          <motion.h1 variants={rise} className="title">
            {greeting()}
          </motion.h1>
          <motion.p variants={rise} className="lede">
            {resume ? 'Pick up where you left off.' : 'Start with one sentence. Say it until it stays.'}
          </motion.p>
        </div>
      </motion.div>

      {ref && item && (
        <motion.section
          className="continue"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="continue-text">
            <span className="label">
              {ref.topic.title} · {grammarLabel(ref.unit.grammar).title}
            </span>
            <p className="continue-sentence">{item.title ?? item.en}</p>
            {!item.title && <Bn className="continue-bn">{item.bn}</Bn>}
          </div>
          <div className="continue-foot">
            <div className="continue-progress">
              <span className="small muted">
                {ref.session.type === 'paragraph' ? 'Paragraph' : 'Sentence'} {index + 1} of {ref.session.items.length}
              </span>
              <Line value={index} max={ref.session.items.length} />
            </div>
            <Link to={practicePath(ref.key)} className="btn btn-primary btn-lg">
              {resume ? 'Continue practice' : 'Start practice'} <ArrowRight size={18} strokeWidth={1.75} />
            </Link>
          </div>
        </motion.section>
      )}

      <motion.div className="home-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
        <span className="inline">
          <span>
            <b>{today}</b> of {settings.dailyGoal} reps today
          </span>
          <Line value={today} max={settings.dailyGoal} />
        </span>
        {due > 0 && (
          <Link to="/review" className="due-link">
            <span className="due-dot" />
            {due} {due === 1 ? 'review' : 'reviews'} due
          </Link>
        )}
      </motion.div>
    </Page>
  );
}
