import { ArrowLeft, Check, Play, RotateCcw, CalendarClock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getLevel, getTopic, getTrack, grammarLabel, practicePath, sessionRefs, typeLabel } from '../lib/content';
import { sessionDone, sessionStatus, trackProgress } from '../lib/progress';
import { dueLabel } from '../lib/srs';
import { useStore } from '../lib/store';
import { Bn, Ring, TopicIcon, TypeChip, topicStyle } from '../components/ui';

export function TrackPage() {
  const { topic: topicId = '', level: levelId = '' } = useParams();
  const { state, settings } = useStore();
  const track = getTrack(topicId, levelId);
  const topic = getTopic(topicId);
  if (!track || !topic) {
    return (
      <div className="page">
        <p className="empty-note">This track does not exist yet.</p>
        <Link to="/library" className="link">Back to library</Link>
      </div>
    );
  }
  const level = getLevel(levelId);
  const refs = sessionRefs(track);
  const p = trackProgress(state, track);
  const bn = settings.showBangla;

  return (
    <div className="page" style={topicStyle(topic.id)}>
      <Link to={`/library?level=${level.id}`} className="back-link">
        <ArrowLeft size={16} /> Library
      </Link>

      <header className="track-head card">
        <div className="track-head-main">
          <div className="track-meta">
            <TopicIcon topic={topic.id} icon={topic.icon} size={56} />
            <div>
              <p className="eyebrow">
                {topic.title} · {level.title} {level.cefr}
              </p>
              <h1>{track.title}</h1>
            </div>
          </div>
          <p className="story">{track.story}</p>
          {bn && <Bn className="story-bn">{track.storyBn}</Bn>}
          <div className="track-stats">
            <span><b>{track.units.length}</b> grammar units</span>
            <span><b>{p.sessions}</b> sessions</span>
            <span><b>{p.items}</b> sentences</span>
            <span><b>{level.targetReps}×</b> each</span>
            <span><b>{(p.items * level.targetReps).toLocaleString()}</b> reps in one pass</span>
          </div>
        </div>
        <div className="track-head-side">
          <Ring value={p.completed} max={p.sessions} size={132} stroke={11}>
            <span className="ring-num">{p.percent}%</span>
            <span className="ring-sub">{p.completed}/{p.sessions} sessions</span>
          </Ring>
          <Link to={practicePath(p.next.key)} className="btn btn-primary">
            <Play size={16} /> {state.attempts[p.next.key] ? 'Continue' : 'Start next'}
          </Link>
          <span className="muted small center">
            {grammarLabel(p.next.unit.grammar).title} · {typeLabel(p.next.session.type).short}
          </span>
        </div>
      </header>

      <ol className="units">
        {track.units.map((unit, ui) => {
          const g = grammarLabel(unit.grammar);
          const unitRefs = refs.filter((r) => r.unitIndex === ui);
          const doneCount = unitRefs.filter((r) => state.sessions[r.key]).length;
          return (
            <li key={unit.grammar} className="unit">
              <span className={`unit-num${doneCount === unitRefs.length ? ' done' : ''}`}>
                {doneCount === unitRefs.length ? <Check size={16} /> : ui + 1}
              </span>
              <div className="unit-body">
                <div className="unit-head">
                  <h2>{g.title}</h2>
                  {bn && <Bn className="muted">{g.titleBn}</Bn>}
                  <span className="spacer" />
                  <span className="muted small">
                    {doneCount}/{unitRefs.length} sessions
                  </span>
                </div>
                <p className="unit-focus">
                  {unit.focus}
                  {bn && <Bn className="muted"> — {unit.focusBn}</Bn>}
                </p>
                <div className="session-grid">
                  {unitRefs.map((ref) => {
                    const status = sessionStatus(state, ref);
                    const stat = state.sessions[ref.key];
                    const attempt = state.attempts[ref.key];
                    const done = sessionDone(state, ref);
                    const label = typeLabel(ref.session.type);
                    const first = ref.session.items[0];
                    return (
                      <Link
                        key={ref.key}
                        to={practicePath(ref.key, status === 'due' ? '?review=1' : '')}
                        className={`card session-card status-${status}`}
                      >
                        <div className="session-card-top">
                          <TypeChip type={ref.session.type} />
                          <span className="spacer" />
                          {status === 'done' && (
                            <span className="status status-done">
                              <Check size={13} /> {dueLabel(stat)}
                            </span>
                          )}
                          {status === 'due' && (
                            <span className="status status-due">
                              <CalendarClock size={13} /> Review due
                            </span>
                          )}
                          {status === 'in-progress' && (
                            <span className="status status-progress">
                              {attempt.index + 1}/{ref.session.items.length}
                            </span>
                          )}
                        </div>
                        <b className="session-title">{label.title}</b>
                        {bn && <Bn className="muted small">{label.titleBn}</Bn>}
                        <p className="session-preview">“{first.title ?? first.en}”</p>
                        <div className="session-foot">
                          <span className="pips" aria-label={`${done} of ${ref.session.items.length} sentences repeated`}>
                            {ref.session.items.map((it, i) => (
                              <span key={it.id} className={`pip${i < done ? ' on' : ''}`} />
                            ))}
                          </span>
                          <span className="session-cta">
                            {status === 'new' && <><Play size={14} /> Start</>}
                            {status === 'in-progress' && <><Play size={14} /> Continue</>}
                            {status === 'done' && <><RotateCcw size={14} /> Again</>}
                            {status === 'due' && <><RotateCcw size={14} /> Review</>}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
