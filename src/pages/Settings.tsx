import { Download, Upload, Trash2, Volume2 } from 'lucide-react';
import { useRef } from 'react';
import { catalog } from '../lib/content';
import { pickVoice, recognitionSupported, ttsSupported, useSpeaker, useVoices } from '../lib/speech';
import { useStore } from '../lib/store';
import type { LevelId, PracticeMode, ProgressState, Theme } from '../lib/types';
import { Bn, Toggle } from '../components/ui';

export function Settings() {
  const { state, settings, updateSettings, reset, importState } = useStore();
  const voices = useVoices();
  const { speak } = useSpeaker();
  const file = useRef<HTMLInputElement>(null);
  const current = pickVoice(voices, settings.voice);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `repetition-english-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as ProgressState;
      if (data.v !== 1 || typeof data.items !== 'object') throw new Error('bad file');
      importState(data);
    } catch {
      alert('This file is not a Repetition English progress file.');
    }
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Make repetition fit you</h1>
        </div>
      </header>

      <section className="card settings-card">
        <h2>Learning</h2>
        <div className="field">
          <span className="field-label">My level</span>
          <div className="segmented wide">
            {catalog.levels.map((l) => (
              <button key={l.id} className={settings.level === l.id ? 'on' : ''} onClick={() => updateSettings({ level: l.id as LevelId })}>
                {l.title} <small>{l.cefr}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Daily goal</span>
          <div className="segmented wide">
            {[50, 100, 200, 300].map((g) => (
              <button key={g} className={settings.dailyGoal === g ? 'on' : ''} onClick={() => updateSettings({ dailyGoal: g })}>
                {g} reps
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Default practice mode</span>
          <div className="segmented wide">
            {(['read', 'speak', 'type'] as PracticeMode[]).map((m) => (
              <button
                key={m}
                className={settings.mode === m ? 'on' : ''}
                disabled={m === 'speak' && !recognitionSupported}
                onClick={() => updateSettings({ mode: m })}
              >
                {m === 'read' ? 'Read aloud' : m === 'speak' ? 'Speak (mic check)' : 'Type'}
              </button>
            ))}
          </div>
          {!recognitionSupported && <p className="muted small">Speak mode needs Chrome or Edge on a laptop.</p>}
        </div>
        <Toggle
          checked={settings.strict}
          onChange={(v) => updateSettings({ strict: v })}
          label="Strict repetition"
          hint="Next stays locked until you finish every rep of the sentence."
        />
        <Toggle
          checked={settings.paceGuard}
          onChange={(v) => updateSettings({ paceGuard: v })}
          label="Pace guard"
          hint="In read-aloud mode the rep button waits about as long as it takes to say the sentence."
        />
        <Toggle
          checked={settings.fade}
          onChange={(v) => updateSettings({ fade: v })}
          label="Memory fade"
          hint="Words disappear a little more with every rep. The last rep is from memory."
        />
      </section>

      <section className="card settings-card">
        <h2>Language</h2>
        <Toggle
          checked={settings.showBangla}
          onChange={(v) => updateSettings({ showBangla: v })}
          label={
            <>
              Show <Bn>বাংলা</Bn>
            </>
          }
          hint="Bengali hints under difficult words, and Bengali titles and tips. Tapping a word always shows its meaning."
        />
      </section>

      <section className="card settings-card">
        <h2>Audio</h2>
        {ttsSupported ? (
          <>
            <div className="field">
              <span className="field-label">Voice</span>
              <div className="row">
                <select value={current?.voiceURI ?? ''} onChange={(e) => updateSettings({ voice: e.target.value || null })}>
                  {!voices.length && <option value="">Browser default voice</option>}
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <button className="btn btn-secondary" onClick={() => speak('It is a beautiful day. Let us repeat it again.')}>
                  <Volume2 size={16} /> Test
                </button>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Speed · {settings.rate.toFixed(2)}×</span>
              <input
                type="range"
                min={0.6}
                max={1.2}
                step={0.05}
                value={settings.rate}
                onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
              />
            </div>
          </>
        ) : (
          <p className="muted">This browser cannot play speech.</p>
        )}
        <Toggle
          checked={settings.autoListen}
          onChange={(v) => updateSettings({ autoListen: v })}
          label="Play each sentence automatically"
          hint="Hear the sentence once when it appears."
        />
      </section>

      <section className="card settings-card">
        <h2>Appearance</h2>
        <div className="segmented wide">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} className={settings.theme === t ? 'on' : ''} onClick={() => updateSettings({ theme: t })}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-card">
        <h2>Your data</h2>
        <p className="muted small">Progress is saved in this browser only. Export it to keep a copy or move to another laptop.</p>
        <div className="row">
          <button className="btn btn-secondary" onClick={exportData}>
            <Download size={16} /> Export progress
          </button>
          <button className="btn btn-secondary" onClick={() => file.current?.click()}>
            <Upload size={16} /> Import
          </button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <span className="spacer" />
          <button
            className="btn btn-danger"
            onClick={() => confirm('Delete all reps, reviews and streaks? Settings stay.') && reset()}
          >
            <Trash2 size={16} /> Reset progress
          </button>
        </div>
      </section>
    </div>
  );
}
