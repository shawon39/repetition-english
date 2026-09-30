import { ArrowRight, Check } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog, getLevel, getTopic, levelTracks, grammarLabel } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { useStore } from '../lib/store';
import type { LevelId } from '../lib/types';
import { Bn, ProgressBar, TopicIcon, topicStyle } from '../components/ui';

export function Library() {
  const { state, settings, updateSettings } = useStore();
  const [params, setParams] = useSearchParams();
  const levelId = (params.get('level') as LevelId) || settings.level;
  const level = getLevel(levelId);
  const tracks = levelTracks(level.id);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Choose a level and a topic</h1>
          <p className="lede">Every topic has its own repetition track at every level. Grammar is never mixed inside a session.</p>
        </div>
      </header>

      <div className="level-tabs" role="tablist">
        {catalog.levels.map((l, i) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={l.id === level.id}
            className={`level-tab${l.id === level.id ? ' active' : ''}`}
            onClick={() => setParams({ level: l.id })}
          >
            <span className="level-step">{i + 1}</span>
            <span className="level-tab-text">
              <b>
                {l.title} <span className="cefr">{l.cefr}</span>
              </b>
              {settings.showBangla ? <Bn className="small muted">{l.titleBn}</Bn> : <span className="small muted">{l.targetReps} reps per sentence</span>}
            </span>
            {settings.level === l.id && <Check size={16} className="level-mine" aria-label="My level" />}
          </button>
        ))}
      </div>

      <div className="level-intro card">
        <div>
          <p>{level.description}</p>
          {settings.showBangla && <Bn className="muted">{level.descriptionBn}</Bn>}
          <p className="grammar-line">
            {[...new Set(tracks.flatMap((t) => t.units.map((u) => u.grammar)))].map((g) => (
              <span key={g} className="grammar-pill">
                {grammarLabel(g).title}
              </span>
            ))}
          </p>
        </div>
        {settings.level !== level.id ? (
          <button className="btn btn-secondary" onClick={() => updateSettings({ level: level.id })}>
            Set as my level
          </button>
        ) : (
          <span className="pill pill-good">
            <Check size={14} /> My level
          </span>
        )}
      </div>

      <div className="library-grid">
        {tracks.map((track) => {
          const topic = getTopic(track.topic)!;
          const p = trackProgress(state, track);
          return (
            <Link key={track.topic} to={`/track/${track.topic}/${track.level}`} className="card lib-card" style={topicStyle(topic.id)}>
              <div className="lib-band">
                <TopicIcon topic={topic.id} icon={topic.icon} size={52} />
                <span className="lib-pct">
                  <b>{p.percent}%</b>
                  <span>done</span>
                </span>
              </div>
              <div className="lib-body">
                <p className="eyebrow">
                  {topic.title}
                  {settings.showBangla && <Bn> · {topic.titleBn}</Bn>}
                </p>
                <h3>{track.title}</h3>
                <p className="muted small clamp-2">{track.story}</p>
                <div className="lib-stats">
                  <span>
                    <b>{p.sessions}</b> sessions
                  </span>
                  <span>
                    <b>{p.items}</b> sentences
                  </span>
                  <span>
                    <b>{p.reps}</b> reps
                  </span>
                </div>
                <ProgressBar value={p.completed} max={p.sessions} />
                <span className="topic-next">
                  Open track <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {!tracks.length && <p className="empty-note">Content for this level is coming soon.</p>}
    </div>
  );
}
