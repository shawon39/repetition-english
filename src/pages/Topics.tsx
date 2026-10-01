import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { catalog, getTopic, levelTracks } from '../lib/content';
import { trackProgress } from '../lib/progress';
import { useStore } from '../lib/store';
import type { LevelId } from '../lib/types';
import { Bn, Line, Page, Segmented, TopicIcon, rise, stagger } from '../components/ui';

export function Topics() {
  const { state, settings, updateSettings } = useStore();
  const tracks = levelTracks(settings.level);

  return (
    <Page>
      <div className="page-head">
        <div>
          <h1 className="title">Topics</h1>
          <p className="lede">Each topic is a short story you repeat, one grammar pattern at a time.</p>
        </div>
        <Segmented<LevelId>
          label="Level"
          value={settings.level}
          onChange={(level) => updateSettings({ level })}
          options={catalog.levels.map((l) => ({ value: l.id, label: l.title }))}
        />
      </div>

      <motion.div key={settings.level} className="tiles" variants={stagger} initial="hidden" animate="show">
        {tracks.map((track) => {
          const topic = getTopic(track.topic)!;
          const p = trackProgress(state, track);
          return (
            <motion.div key={track.topic} variants={rise} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Link to={`/topic/${track.topic}/${track.level}`} className="tile">
                <TopicIcon icon={topic.icon} />
                <div>
                  <div className="tile-name">{topic.title}</div>
                  <Bn className="tile-bn">{topic.titleBn}</Bn>
                </div>
                <div className="tile-foot">
                  <span className="small muted">
                    {p.sessions} sessions · {p.items} {track.level === 'starter' || track.level === 'elementary' ? 'sentences' : 'items'}
                  </span>
                  <Line value={p.completed} max={p.sessions} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </Page>
  );
}
