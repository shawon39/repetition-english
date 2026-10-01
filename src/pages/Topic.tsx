import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { getLevel, getTopic, getTrack, grammarLabel, practicePath, sessionRefs, typeLabel } from '../lib/content';
import { sessionStatus, trackProgress } from '../lib/progress';
import { useStore } from '../lib/store';
import { Bn, Page, rise, stagger } from '../components/ui';

export function Topic() {
  const { topic: topicId = '', level: levelId = '' } = useParams();
  const { state } = useStore();
  const track = getTrack(topicId, levelId);
  const topic = getTopic(topicId);

  if (!track || !topic) {
    return (
      <Page>
        <p className="empty">This topic is not available yet.</p>
      </Page>
    );
  }

  const level = getLevel(levelId);
  const refs = sessionRefs(track);
  const p = trackProgress(state, track);

  return (
    <Page>
      <Link to="/topics" className="back">
        <ArrowLeft size={16} strokeWidth={1.5} /> Topics
      </Link>

      <div className="track-head">
        <div>
          <span className="label">
            {topic.title} · {level.title}
          </span>
          <h1 className="title">{track.title}</h1>
          <p className="lede">{track.story}</p>
        </div>
        <Link to={practicePath(p.next.key)} className="btn btn-primary">
          {p.completed ? 'Continue' : 'Start'} <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      </div>

      <motion.section className="units" variants={stagger} initial="hidden" animate="show">
        {track.units.map((unit, ui) => {
          const g = grammarLabel(unit.grammar);
          const unitRefs = refs.filter((r) => r.unitIndex === ui);
          const done = unitRefs.filter((r) => state.sessions[r.key]).length;
          return (
            <motion.div key={unit.grammar} className="unit" variants={rise}>
              <div className="unit-head">
                <span className="unit-name">{g.title}</span>
                <Bn className="unit-bn">{g.titleBn}</Bn>
                <span className="spacer" />
                <span className="small muted">
                  {done} of {unitRefs.length}
                </span>
              </div>
              <div className="pills">
                {unitRefs.map((ref) => {
                  const status = sessionStatus(state, ref);
                  const isNext = ref.key === p.next.key && status === 'new';
                  const attempt = state.attempts[ref.key];
                  const cls =
                    status === 'done' ? 'is-done' : status === 'due' ? 'is-due' : status === 'in-progress' ? 'is-progress' : isNext ? 'is-next' : '';
                  return (
                    <Link key={ref.key} to={practicePath(ref.key, status === 'due' ? '?review=1' : '')} className={`pill ${cls}`}>
                      {status === 'done' && <Check size={14} strokeWidth={2} />}
                      {typeLabel(ref.session.type).title}
                      {status === 'due' && ' · due'}
                      {status === 'in-progress' && (
                        <span className="pill-count">
                          {attempt.index + 1}/{ref.session.items.length}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.section>
    </Page>
  );
}
