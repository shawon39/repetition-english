import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Keyboard,
  Lock,
  Mic,
  MicOff,
  Repeat2,
  Snail,
  Volume2,
  X,
  BookOpenText,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Sentence } from '../components/Sentence';
import { Bn, Kbd, Ring, TopicIcon, TypeChip, topicStyle } from '../components/ui';
import { findSession, grammarLabel, itemKey, nextSessionRef, practicePath, typeLabel } from '../lib/content';
import { recognitionSupported, useRecognition, useSpeaker } from '../lib/speech';
import { INTERVALS, MASTERY, dueLabel, mastery } from '../lib/srs';
import { useStore } from '../lib/store';
import { align, fadeFraction, normalizeWords, speakingTime } from '../lib/text';
import type { PracticeMode } from '../lib/types';

type Kind = 'learn' | 'review' | 'chain';

export function Practice() {
  const { topic = '', level = '', grammar = '', type = '' } = useParams();
  const key = `${topic}/${level}/${grammar}/${type}`;
  const ref = findSession(key);
  const [params] = useSearchParams();
  const kind: Kind = params.get('chain') ? 'chain' : params.get('review') ? 'review' : 'learn';
  if (!ref) {
    return (
      <div className="page">
        <p className="empty-note">This session does not exist.</p>
        <Link to="/library" className="link">Back to library</Link>
      </div>
    );
  }
  // Remount when the session or the kind of run changes.
  return <PracticeRun key={`${key}:${kind}`} sessionKey={key} kind={kind} />;
}

function PracticeRun({ sessionKey, kind }: { sessionKey: string; kind: Kind }) {
  const ref = findSession(sessionKey)!;
  const { session, topic, level, unit } = ref;
  const items = session.items;
  const store = useStore();
  const { state, settings, updateSettings } = store;
  const navigate = useNavigate();
  const { speak, speaking } = useSpeaker();
  const trackUrl = `/track/${topic.id}/${level.id}`;

  const base = level.targetReps;
  const target = kind === 'chain' ? 1 : kind === 'review' ? Math.max(2, base - 2) : base;
  const paragraph = session.type === 'paragraph';

  const saved = kind === 'learn' ? state.attempts[sessionKey] : undefined;
  const resumable = saved && saved.counts.length === items.length;
  const [counts, setCounts] = useState<number[]>(() => (resumable ? saved.counts : items.map(() => 0)));
  const [index, setIndex] = useState(() => (resumable ? Math.min(saved.index, items.length - 1) : 0));
  const [startedAt] = useState(() => (resumable ? saved.startedAt : Date.now()));
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const [ready, setReady] = useState(true);
  const [paceKey, setPaceKey] = useState(0);

  const item = items[index];
  const iKey = itemKey(sessionKey, item.id);
  const done = counts[index];
  const complete = done >= target;
  const mode: PracticeMode = settings.mode === 'speak' && !recognitionSupported ? 'read' : settings.mode;
  const targetWords = useMemo(() => normalizeWords(item.en), [item.en]);
  const sessionReps = counts.reduce((a, b) => a + Math.min(b, target), 0);
  const totalNeeded = items.length * target;

  // Persist the run so the learner can resume it later.
  useEffect(() => {
    if (kind !== 'learn' || finishedAt) return;
    if (counts.every((c) => c === 0) && index === 0) return;
    store.saveAttempt(sessionKey, { counts, index, startedAt, updatedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, index]);

  // ---- Pace guard: the repeat button unlocks after roughly the time it takes to say the text.
  const armPace = useCallback(() => {
    if (!settings.paceGuard || mode !== 'read') {
      setReady(true);
      return;
    }
    setReady(false);
    setPaceKey((k) => k + 1);
  }, [settings.paceGuard, mode]);

  useEffect(() => {
    if (ready) return;
    const ms = speakingTime(item.en) * (kind === 'chain' ? 0.8 : 1);
    const t = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(t);
  }, [ready, paceKey, item.en, kind]);

  useEffect(() => {
    armPace();
    if (settings.autoListen && kind !== 'chain') speak(item.en);
    setNudge(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const flash = (msg: string) => {
    setNudge(msg);
    window.setTimeout(() => setNudge((m) => (m === msg ? null : m)), 1800);
  };

  const addRep = useCallback(() => {
    setCounts((c) => c.map((v, i) => (i === index ? v + 1 : v)));
    store.rep(iKey);
    setPulse((p) => p + 1);
    armPace();
  }, [index, iKey, store, armPace]);

  const tryRep = () => {
    if (mode !== 'read') return;
    if (!ready) return flash('Say it aloud first. The button unlocks in a moment.');
    addRep();
  };

  const finish = () => {
    // A chain round is extra practice; it never moves the review schedule.
    if (kind !== 'chain') store.complete(sessionKey);
    setFinishedAt(Date.now());
    listening && stopMic();
  };

  const go = (to: number) => {
    if (to < 0) return;
    if (to > index && settings.strict && counts.slice(0, to).some((c) => c < target)) {
      const left = target - done;
      return flash(left > 0 ? `${left} more ${left === 1 ? 'rep' : 'reps'} to unlock the next sentence.` : 'Finish the earlier sentences first.');
    }
    if (to >= items.length) return finish();
    setIndex(to);
    heardRef.current = '';
    setHeard('');
    setTyped('');
    setTypeResult(null);
  };

  // ---- Speak mode
  // Final phrases pile up until they match the sentence well enough to count as a rep.
  const [heard, setHeard] = useState('');
  const heardRef = useRef('');
  const onFinal = useCallback(
    (text: string) => {
      const words = normalizeWords(`${heardRef.current} ${text}`).slice(-targetWords.length * 2);
      if (align(targetWords, words).score >= 0.8) {
        addRep();
        heardRef.current = '';
      } else {
        heardRef.current = words.join(' ');
      }
      setHeard(heardRef.current);
    },
    [targetWords, addRep],
  );
  const { listening, interim, error: micError, start: startMic, stop: stopMic } = useRecognition(onFinal);
  useEffect(() => {
    if (mode !== 'speak' && listening) stopMic();
  }, [mode, listening, stopMic]);
  const heardWords = normalizeWords(heard);
  const interimWords = normalizeWords(interim);
  const heardAlign = align(targetWords, [...heardWords, ...interimWords]);

  // ---- Type mode
  const [typed, setTyped] = useState('');
  const [typeResult, setTypeResult] = useState<{ words: string[]; hit: boolean[] } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitTyped = () => {
    if (!typed.trim()) {
      if (complete) go(index + 1);
      return;
    }
    const words = normalizeWords(typed);
    const a = align(targetWords, words);
    if (a.exact) {
      addRep();
      setTyped('');
      setTypeResult(null);
    } else {
      setTypeResult({ words, hit: a.saidHit });
      flash(`${a.targetHit.filter(Boolean).length} of ${targetWords.length} words right. Try again.`);
    }
  };
  useEffect(() => {
    if (mode === 'type' && !finishedAt) inputRef.current?.focus();
  }, [mode, index, finishedAt]);

  // ---- Keyboard
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    if (finishedAt) return;
    const inField = (e.target as HTMLElement).closest('textarea, input, select');
    if (inField) {
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ' && mode === 'read') tryRep();
    else if (k === 'enter' || k === 'arrowright') go(index + 1);
    else if (k === 'arrowleft') go(index - 1);
    else if (k === 'l') speak(item.en);
    else if (k === 's') speak(item.en, true);
    else if (k === 'b') updateSettings({ showBangla: !settings.showBangla });
    else if (k === 'f') updateSettings({ fade: !settings.fade });
    else if (k === 'h') setPeek(true);
    else if (k === 'm' && mode === 'speak') (listening ? stopMic() : startMic());
    else if (k === '1') updateSettings({ mode: 'read' });
    else if (k === '2' && recognitionSupported) updateSettings({ mode: 'speak' });
    else if (k === '3') updateSettings({ mode: 'type' });
    else if (k === 'escape') navigate(trackUrl);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current(e);
    const up = (e: KeyboardEvent) => e.key.toLowerCase() === 'h' && setPeek(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---- Memory fade
  // Reviews start half faded; a chain round keeps first-letter hints on every word.
  const hidden = !settings.fade || complete ? 0 : kind === 'chain' ? 0.75 : fadeFraction(done, target, kind === 'review' ? 0.5 : 0);
  const stage = hidden === 0 ? (complete ? 'done' : 'read') : hidden >= 1 ? 'recall' : 'fade';

  if (finishedAt) {
    return <Summary sessionKey={sessionKey} kind={kind} counts={counts} target={target} elapsed={finishedAt - startedAt} />;
  }

  const lifetime = state.items[iKey]?.reps ?? 0;
  const itemMastery = MASTERY.find((m) => m.id === mastery(state.items[iKey], base))!;
  const left = Math.max(0, target - done);

  return (
    <div className="practice" style={topicStyle(topic.id)}>
      <header className="p-top">
        <Link to={trackUrl} className="icon-btn" aria-label="Exit session (Esc)" title="Exit (Esc)">
          <X size={20} />
        </Link>
        <div className="p-crumb">
          <TopicIcon topic={topic.id} icon={topic.icon} size={32} />
          <span className="p-crumb-text">
            <b>{topic.title}</b> · {level.title} <span className="sep">›</span> {grammarLabel(unit.grammar).title}
          </span>
          <TypeChip type={session.type} full />
          {kind === 'review' && <span className="pill pill-rep sm"><RotateCcw size={12} /> Review</span>}
          {kind === 'chain' && <span className="pill pill-rep sm"><Link2 size={12} /> Chain round</span>}
        </div>
        <div className="p-tools">
          <div className="segmented" role="radiogroup" aria-label="Practice mode">
            {([
              ['read', 'Read aloud', Repeat2],
              ['speak', 'Speak', Mic],
              ['type', 'Type', Keyboard],
            ] as const).map(([m, label, Icon], i) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                className={mode === m ? 'on' : ''}
                disabled={m === 'speak' && !recognitionSupported}
                title={m === 'speak' && !recognitionSupported ? 'Speech recognition needs Chrome or Edge' : `${label} (${i + 1})`}
                onClick={() => updateSettings({ mode: m })}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <button className={`chip-toggle${settings.fade ? ' on' : ''}`} onClick={() => updateSettings({ fade: !settings.fade })} title="Memory fade (F)">
            <Eye size={15} /> Fade
          </button>
          <button className={`chip-toggle${settings.showBangla ? ' on' : ''}`} onClick={() => updateSettings({ showBangla: !settings.showBangla })} title="Show Bengali (B)">
            <Bn>বাংলা</Bn>
          </button>
        </div>
      </header>

      <div className="p-progress" aria-label={`Sentence ${index + 1} of ${items.length}`}>
        {items.map((it, i) => (
          <span key={it.id} className={`p-seg${i === index ? ' current' : ''}`}>
            <span style={{ width: `${Math.min(1, counts[i] / target) * 100}%` }} />
          </span>
        ))}
      </div>

      <div className="p-body">
        <section className="stage">
          <div className="pattern">
            <span className="pattern-label">Pattern</span>
            <code>{session.pattern}</code>
            {settings.showBangla && <Bn className="pattern-bn">{session.tipBn}</Bn>}
          </div>

          <div className={`stage-card${complete ? ' is-complete' : ''}`}>
            <div className="stage-meta">
              <span>
                {paragraph ? 'Paragraph' : 'Sentence'} <b>{index + 1}</b> of {items.length}
              </span>
              <span className={`fade-steps stage-${stage}`}>
                <span className="fs read">Read</span>
                <span className="fs fade">Fade</span>
                <span className="fs recall">Recall</span>
              </span>
            </div>
            {paragraph && item.title && (
              <h2 className="para-title">
                <BookOpenText size={18} /> {item.title}
              </h2>
            )}
            <Sentence
              item={item}
              seed={iKey}
              hidden={hidden}
              showBangla={settings.showBangla}
              peek={peek}
              paragraph={paragraph}
              onSpeak={(t) => speak(t)}
            />
            <p className="stage-hint">
              {complete
                ? `Done. ${done > target ? `+${done - target} extra. ` : ''}Press Enter for the next ${paragraph ? 'paragraph' : 'sentence'}.`
                : stage === 'recall'
                  ? `Last rep: ${mode === 'type' ? 'type' : 'say'} it from memory. Hold H to peek.`
                  : stage === 'fade'
                    ? `Some words are hidden now. ${mode === 'type' ? 'Type' : 'Say'} the full ${paragraph ? 'paragraph' : 'sentence'}.`
                    : mode === 'read'
                      ? 'Listen, then say it aloud. Tap a dotted word for its meaning.'
                      : mode === 'speak'
                        ? 'Turn on the mic and say it. A rep counts when 80% of the words match.'
                        : 'Type it exactly and press Enter. Case and punctuation do not matter.'}
            </p>
          </div>

          {mode === 'speak' && (
            <div className={`heard${listening ? ' live' : ''}`}>
              <span className="heard-label">{listening ? 'Listening…' : 'Mic is off'}</span>
              <span className="heard-text">
                {heardWords.length + interimWords.length === 0 ? (
                  <span className="muted">{listening ? 'Say the sentence…' : 'Press M or the mic button to start.'}</span>
                ) : (
                  [...heardWords, ...interimWords].map((w, i) => (
                    <span key={i} className={`hw${heardAlign.saidHit[i] ? ' hit' : ''}${i >= heardWords.length ? ' interim' : ''}`}>
                      {w}{' '}
                    </span>
                  ))
                )}
              </span>
              <span className="heard-score">{Math.round(heardAlign.score * 100)}%</span>
              {micError && <span className="heard-error">{micError}</span>}
            </div>
          )}

          {mode === 'type' && (
            <div className="typebox">
              <textarea
                ref={inputRef}
                value={typed}
                rows={paragraph ? 4 : 1}
                placeholder={complete ? 'Done. Press Enter for the next sentence.' : 'Type the sentence and press Enter'}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setTypeResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitTyped();
                  }
                }}
                spellCheck={false}
                autoComplete="off"
              />
              {typeResult && (
                <p className="type-feedback">
                  {typeResult.words.map((w, i) => (
                    <span key={i} className={typeResult.hit[i] ? 'ok' : 'bad'}>
                      {w}{' '}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          <div className="controls">
            <div className="ctrl-group">
              <button className="btn btn-ghost" onClick={() => speak(item.en)} title="Listen (L)">
                <Volume2 size={18} className={speaking ? 'speaking' : ''} /> <span className="ctrl-text">Listen</span> <Kbd>L</Kbd>
              </button>
              <button className="btn btn-ghost" onClick={() => speak(item.en, true)} title="Slow (S)">
                <Snail size={18} /> <span className="ctrl-text">Slow</span> <Kbd>S</Kbd>
              </button>
              <button
                className="btn btn-ghost"
                onMouseDown={() => setPeek(true)}
                onMouseUp={() => setPeek(false)}
                onMouseLeave={() => setPeek(false)}
                title="Hold to peek (H)"
              >
                <Eye size={18} /> <span className="ctrl-text">Peek</span> <Kbd>H</Kbd>
              </button>
            </div>

            <div className="rep-zone">
              <Ring key={pulse} value={Math.min(done, target)} max={target} segments={target} size={92} stroke={9} tone={complete ? 'good' : 'rep'}>
                <span className={`rep-count${pulse ? ' bump' : ''}`}>
                  {Math.min(done, target)}
                  <small>/{target}</small>
                </span>
              </Ring>
              {mode === 'read' && (
                <button className={`btn btn-rep${ready ? '' : ' waiting'}${complete ? ' is-extra' : ''}`} onClick={tryRep}>
                  {!ready && <span key={paceKey} className="pace-fill" style={{ animationDuration: `${speakingTime(item.en) * (kind === 'chain' ? 0.8 : 1)}ms` }} />}
                  <span className="btn-rep-label">
                    <Check size={20} /> {complete ? 'Extra rep' : 'I said it'}
                  </span>
                  <Kbd>Space</Kbd>
                </button>
              )}
              {mode === 'speak' && (
                <button className={`btn btn-rep${listening ? ' listening' : ''}`} onClick={() => (listening ? stopMic() : startMic())}>
                  <span className="btn-rep-label">
                    {listening ? <MicOff size={20} /> : <Mic size={20} />} {listening ? 'Stop mic' : 'Start mic'}
                  </span>
                  <Kbd>M</Kbd>
                </button>
              )}
              {mode === 'type' && (
                <button className="btn btn-rep" onClick={submitTyped}>
                  <span className="btn-rep-label">
                    <Check size={20} /> Check
                  </span>
                  <Kbd>Enter</Kbd>
                </button>
              )}
            </div>

            <div className="ctrl-group end">
              <button className="btn btn-ghost" onClick={() => go(index - 1)} disabled={index === 0} title="Previous (←)">
                <ArrowLeft size={18} />
              </button>
              <button
                className={`btn ${complete ? 'btn-primary' : 'btn-locked'}`}
                onClick={() => go(index + 1)}
                title="Next (Enter)"
              >
                {complete || !settings.strict ? (
                  <>
                    {index === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <Lock size={16} /> {left} more
                  </>
                )}
              </button>
            </div>
          </div>
          <div className={`nudge${nudge ? ' show' : ''}`} role="status">
            {nudge}
          </div>
        </section>

        <aside className="p-side">
          <div className="side-block">
            <p className="eyebrow">This session</p>
            <ol className="item-list">
              {items.map((it, i) => {
                const reachable = !settings.strict || counts.slice(0, i).every((c) => c >= target);
                return (
                  <li key={it.id}>
                    <button
                      className={`item-row${i === index ? ' current' : ''}${counts[i] >= target ? ' done' : ''}`}
                      disabled={!reachable}
                      onClick={() => go(i)}
                    >
                      <span className="item-num">{counts[i] >= target ? <Check size={12} /> : i + 1}</span>
                      <span className="item-text">{it.title ?? it.en}</span>
                      <span className="item-pips">
                        {Array.from({ length: target }, (_, p) => (
                          <span key={p} className={p < counts[i] ? 'on' : ''} />
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="side-block side-stats">
            <div>
              <span className="stat-num">
                {sessionReps}
                <small>/{totalNeeded}</small>
              </span>
              <span className="stat-label">reps this session</span>
            </div>
            <div>
              <span className="stat-num">{lifetime}</span>
              <span className="stat-label">times you said this</span>
            </div>
            <div className="span-2">
              <span className={`mastery mastery-${itemMastery.id}`}>{itemMastery.label}</span>
              <span className="stat-label">{itemMastery.hint}</span>
            </div>
          </div>

          <div className="side-block shortcuts">
            <p className="eyebrow">Keyboard</p>
            <dl>
              {mode === 'read' && <><dt><Kbd>Space</Kbd></dt><dd>Count a rep</dd></>}
              {mode === 'speak' && <><dt><Kbd>M</Kbd></dt><dd>Mic on / off</dd></>}
              <dt><Kbd>Enter</Kbd></dt><dd>Next sentence</dd>
              <dt><Kbd>L</Kbd> <Kbd>S</Kbd></dt><dd>Listen / slow</dd>
              <dt><Kbd>H</Kbd></dt><dd>Hold to peek</dd>
              <dt><Kbd>B</Kbd> <Kbd>F</Kbd></dt><dd>Bengali / fade</dd>
              <dt><Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd></dt><dd>Read / speak / type</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Summary({
  sessionKey,
  kind,
  counts,
  target,
  elapsed,
}: {
  sessionKey: string;
  kind: Kind;
  counts: number[];
  target: number;
  elapsed: number;
}) {
  const ref = findSession(sessionKey)!;
  const { state, settings } = useStore();
  const next = nextSessionRef(sessionKey);
  const stat = state.sessions[sessionKey];
  const reps = counts.reduce((a, b) => a + b, 0);
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.round((elapsed % 60000) / 1000);
  const trackUrl = `/track/${ref.topic.id}/${ref.level.id}`;

  return (
    <div className="summary-wrap" style={topicStyle(ref.topic.id)}>
      <div className="summary card">
        <Ring value={1} max={1} size={112} stroke={10} tone="good">
          <Check size={44} strokeWidth={2.6} />
        </Ring>
        <p className="eyebrow">{kind === 'chain' ? 'Chain round complete' : kind === 'review' ? 'Review complete' : 'Session complete'}</p>
        <h1>
          {ref.topic.title} · {typeLabel(ref.session.type).title}
        </h1>
        <p className="muted">
          {ref.level.title} · {grammarLabel(ref.unit.grammar).title}
        </p>

        <div className="summary-stats">
          <div>
            <b>{reps}</b>
            <span>reps</span>
          </div>
          <div>
            <b>{counts.length}</b>
            <span>{ref.session.type === 'paragraph' ? 'paragraphs' : 'sentences'}</span>
          </div>
          <div>
            <b>
              {mins}:{String(secs).padStart(2, '0')}
            </b>
            <span>minutes</span>
          </div>
          <div>
            <b>{target}×</b>
            <span>each</span>
          </div>
        </div>

        {stat && kind !== 'chain' && (
          <p className="summary-next">
            <RotateCcw size={16} /> Next repetition: <b>{dueLabel(stat).toLowerCase()}</b>
            <span className="muted"> · step {stat.box} of {INTERVALS.length - 1}</span>
          </p>
        )}

        <div className="summary-actions">
          {kind !== 'chain' && (
            <Link to={practicePath(sessionKey, '?chain=1')} className="btn btn-secondary">
              <Link2 size={16} /> Chain round: all {counts.length} from memory
            </Link>
          )}
          {next ? (
            <Link to={practicePath(next.key)} className="btn btn-primary">
              Next: {typeLabel(next.session.type).title} <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to={trackUrl} className="btn btn-primary">
              Track complete <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <Link to={trackUrl} className="link">
          Back to {ref.track.title}
        </Link>
      </div>

      <div className="summary-list card">
        <p className="eyebrow">What you repeated</p>
        <ol>
          {ref.session.items.map((it, i) => (
            <li key={it.id}>
              <span className="item-text">{it.title ?? it.en}</span>
              <span className="muted small">
                {counts[i]}× now · {state.items[itemKey(sessionKey, it.id)]?.reps ?? 0}× total
              </span>
            </li>
          ))}
        </ol>
        {settings.showBangla && <Bn className="muted small">{ref.session.tipBn}</Bn>}
      </div>
    </div>
  );
}
