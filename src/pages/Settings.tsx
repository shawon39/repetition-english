import { useRef, useState } from 'react';
import { catalog } from '../lib/content';
import { pickVoice, ttsSupported, useSpeaker, useVoices } from '../lib/speech';
import { useStore } from '../lib/store';
import type { LevelId, ProgressState, Theme } from '../lib/types';
import { Page, Segmented, Switch } from '../components/ui';

export function Settings() {
  const { state, settings, updateSettings, reset, importState } = useStore();
  const voices = useVoices();
  const { speak } = useSpeaker();
  const file = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const current = pickVoice(voices, settings.voice);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `repetition-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as ProgressState;
      if (data.v !== 1 || typeof data.items !== 'object') throw new Error('bad file');
      importState(data);
      setMessage('Progress imported.');
    } catch {
      setMessage('That file is not a Repetition progress file.');
    }
  };

  const toggle = (name: string, hint: string, key: 'showMeaning' | 'fade' | 'strict' | 'paceGuard' | 'autoListen') => (
    <div className="setting">
      <div className="setting-text">
        <span className="setting-name">{name}</span>
        <span className="setting-hint">{hint}</span>
      </div>
      <Switch label={name} checked={settings[key]} onChange={(v) => updateSettings({ [key]: v })} />
    </div>
  );

  return (
    <Page className="page narrow">
      <h1 className="title">Settings</h1>

      <section className="settings">
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Level</span>
          </div>
          <Segmented<LevelId>
            small
            label="Level"
            value={settings.level}
            onChange={(level) => updateSettings({ level })}
            options={catalog.levels.map((l) => ({ value: l.id, label: l.title }))}
          />
        </div>
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Daily goal</span>
            <span className="setting-hint">Reps per day</span>
          </div>
          <Segmented<string>
            small
            label="Daily goal"
            value={String(settings.dailyGoal)}
            onChange={(v) => updateSettings({ dailyGoal: Number(v) })}
            options={['50', '100', '200', '300'].map((v) => ({ value: v, label: v }))}
          />
        </div>
        {toggle('Show Bangla meaning first', 'Open the full-sentence meaning on every sentence.', 'showMeaning')}
        {toggle('Memory fade', 'Words disappear a little more with every rep.', 'fade')}
        {toggle('Finish every rep', 'The next sentence unlocks only after the last rep.', 'strict')}
        {toggle('Pace guard', 'Repeat waits about as long as the sentence takes to say.', 'paceGuard')}
        {toggle('Auto-play sentences', 'Hear each sentence once when it appears. You can also turn this off with the speaker in practice.', 'autoListen')}
        {ttsSupported && (
          <div className="setting">
            <div className="setting-text">
              <span className="setting-name">Voice</span>
              <button className="link" style={{ border: 0, background: 'none', padding: 0, alignSelf: 'flex-start' }} onClick={() => speak('It is a beautiful day.')}>
                Play a sample
              </button>
            </div>
            <select value={current?.voiceURI ?? ''} onChange={(e) => updateSettings({ voice: e.target.value || null })} aria-label="Voice">
              {!voices.length && <option value="">Browser default</option>}
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Speed</span>
            <span className="setting-hint">{settings.rate.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            aria-label="Speech speed"
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.rate}
            onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
          />
        </div>
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Appearance</span>
          </div>
          <Segmented<Theme>
            small
            label="Appearance"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Your progress</span>
            <span className="setting-hint">{message || 'Saved in this browser. Export it to keep a copy.'}</span>
          </div>
          <button className="btn btn-quiet" onClick={exportData}>
            Export
          </button>
          <button className="btn btn-quiet" onClick={() => file.current?.click()}>
            Import
          </button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </div>
        <div className="setting">
          <div className="setting-text">
            <span className="setting-name">Reset progress</span>
            <span className="setting-hint">Deletes all reps, reviews and streaks. Settings stay.</span>
          </div>
          {confirmReset ? (
            <>
              <button className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="btn btn-quiet danger"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                  setMessage('Progress reset.');
                }}
              >
                Delete everything
              </button>
            </>
          ) : (
            <button className="btn btn-quiet danger" onClick={() => setConfirmReset(true)}>
              Reset
            </button>
          )}
        </div>
      </section>
    </Page>
  );
}
