import { ArrowRight, Ear, Flame, Mic, Play, Repeat, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { findSession, getLevel, getTopic, grammarLabel, levelTracks, practicePath, typeLabel } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { dayKey, dueLabel, isDue, streak } from '../lib/srs';
import { useStore } from '../lib/store';
import { Bn, ProgressBar, Ring, TopicIcon, TypeChip, topicStyle } from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Today() {
  const { state, settings } = useStore();
  const level = getLevel(settings.level);
  const tracks = levelTracks(settings.level);
  const todayReps = state.days[dayKey()] ?? 0;
  const totalReps = Object.values(state.days).reduce((a, b) => a + b, 0);
  const days = streak(state.days);

  const resume = Object.entries(state.attempts)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([key, attempt]) => ({ ref: findSession(key), attempt }))
    .find((x) => x.ref);
  const fallback = tracks.length ? trackProgress(state, tracks[0]).next : undefined;
  const hero = resume?.ref ?? fallback;
  const heroIndex = resume?.attempt.index ?? 0;
  const heroItem = hero?.session.items[Math.min(heroIndex, (hero?.session.items.length ?? 1) - 1)];

  const due = Object.entries(state.sessions)
    .filter(([, s]) => isDue(s))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([key, stat]) => ({ ref: findSession(key), stat }))
    .filter((x) => x.ref)
    .slice(0, 4);

  const sessionsToday = Object.values(state.sessions).filter((s) => dayKey(s.lastCompleted) === dayKey()).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting()}</h1>
          <p className="lede">Repeat today. Remember tomorrow.</p>
        </div>
        <div className="head-pills">
          <span className={`pill${days ? ' pill-rep' : ''}`}>
            <Flame size={16} /> {days} day streak
          </span>
          <Link to="/library" className="pill">
            {level.title} · {level.cefr}
          </Link>
        </div>
      </header>

      <section className="hero-grid">
        {hero && heroItem && (
          <article className="card hero-card" style={topicStyle(hero.topic.id)}>
            <div className="hero-top">
              <TopicIcon topic={hero.topic.id} icon={hero.topic.icon} size={40} />
              <div>
                <p className="eyebrow">{resume ? 'Continue repeating' : 'Start here'}</p>
                <p className="hero-crumb">
                  {hero.topic.title} · {hero.level.title} · {grammarLabel(hero.unit.grammar).title}
                </p>
              </div>
              <span className="spacer" />
              <TypeChip type={hero.session.type} full />
            </div>
            <blockquote className="hero-quote">“{heroItem.title ?? heroItem.en}”</blockquote>
            <div className="hero-foot">
              <div className="hero-progress">
                <span className="muted small">
                  Sentence {heroIndex + 1} of {hero.session.items.length} · {hero.level.targetReps} reps each
                </span>
                <ProgressBar value={heroIndex} max={hero.session.items.length} />
              </div>
              <Link to={practicePath(hero.key)} className="btn btn-primary btn-lg">
                <Play size={18} /> {resume ? 'Resume' : 'Start'}
              </Link>
            </div>
          </article>
        )}

        <article className="card goal-card">
          <p className="eyebrow">Today's goal</p>
          <Ring value={todayReps} max={settings.dailyGoal} size={148} stroke={12} tone="rep">
            <span className="ring-num">{todayReps}</span>
            <span className="ring-sub">of {settings.dailyGoal} reps</span>
          </Ring>
          <div className="goal-stats">
            <div>
              <b>{sessionsToday}</b>
              <span>sessions</span>
            </div>
            <div>
              <b>{totalReps.toLocaleString()}</b>
              <span>total reps</span>
            </div>
          </div>
        </article>
      </section>

      {totalReps === 0 && (
        <section className="how">
          <div className="how-step">
            <span className="how-icon"><Ear size={20} /></span>
            <div>
              <b>1. Listen</b>
              <p>Hear the sentence. Tap a dotted word for its Bengali meaning.</p>
            </div>
          </div>
          <div className="how-step">
            <span className="how-icon"><Repeat size={20} /></span>
            <div>
              <b>2. Repeat aloud</b>
              <p>Say it {level.targetReps} times. Next unlocks only after the last rep.</p>
            </div>
          </div>
          <div className="how-step">
            <span className="how-icon"><EyeOff size={20} /></span>
            <div>
              <b>3. Recall</b>
              <p>Words fade with every rep. The last rep is from memory.</p>
            </div>
          </div>
          <div className="how-step">
            <span className="how-icon"><Mic size={20} /></span>
            <div>
              <b>4. Come back</b>
              <p>Finished sessions return for review after 1, 3, 7, 14 days.</p>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Due for repetition</h2>
          <Link to="/review" className="link">
            Review queue <ArrowRight size={14} />
          </Link>
        </div>
        {due.length ? (
          <div className="due-list">
            {due.map(({ ref, stat }) => (
              <Link key={ref!.key} to={practicePath(ref!.key, '?review=1')} className="due-row" style={topicStyle(ref!.topic.id)}>
                <TopicIcon topic={ref!.topic.id} icon={ref!.topic.icon} size={34} />
                <span className="due-main">
                  <b>{ref!.topic.title}</b>
                  <span className="muted small">
                    {ref!.level.title} · {grammarLabel(ref!.unit.grammar).title} · {typeLabel(ref!.session.type).title}
                  </span>
                </span>
                <span className="due-when">{dueLabel(stat)}</span>
                <ArrowRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            Nothing is due. Finish a session and it comes back here tomorrow for its first review.
          </p>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            Topics · {level.title}
            {settings.showBangla && <Bn className="muted h-bn">{level.titleBn}</Bn>}
          </h2>
          <Link to="/library" className="link">
            All levels <ArrowRight size={14} />
          </Link>
        </div>
        <div className="topic-grid">
          {tracks.map((track) => {
            const topic = getTopic(track.topic)!;
            const p = trackProgress(state, track);
            return (
              <Link key={track.topic} to={`/track/${track.topic}/${track.level}`} className="card topic-card" style={topicStyle(topic.id)}>
                <div className="topic-card-top">
                  <TopicIcon topic={topic.id} icon={topic.icon} />
                  <div className="topic-card-title">
                    <b>{topic.title}</b>
                    {settings.showBangla && <Bn className="muted small">{topic.titleBn}</Bn>}
                  </div>
                  <span className="topic-pct">{p.percent}%</span>
                </div>
                <p className="topic-track-title">{track.title}</p>
                <p className="muted small">
                  {p.sessions} sessions · {p.items} sentences{p.due ? ` · ${p.due} due` : ''}
                </p>
                <ProgressBar value={p.completed} max={p.sessions} />
                <span className="topic-next">
                  Next: {grammarLabel(p.next.unit.grammar).title} · {typeLabel(p.next.session.type).short}
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
          {!tracks.length && <p className="empty-note">No content for this level yet.</p>}
        </div>
      </section>
    </div>
  );
}

