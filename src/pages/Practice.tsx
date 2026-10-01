import { ArrowRight, Check, Mic, MicOff, RotateCcw, Volume2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Sentence } from '../components/Sentence';
import { Bn, Dots, EASE_OUT, Line, Segmented } from '../components/ui';
import { findSession, grammarLabel, itemKey, nextSessionRef, practicePath, typeLabel } from '../lib/content';
import { recognitionSupported, useRecognition, useSpeaker } from '../lib/speech';
import { dueLabel } from '../lib/srs';
import { useStore } from '../lib/store';
import { align, fadeFraction, normalizeWords, speakingTime } from '../lib/text';
import type { PracticeMode } from '../lib/types';

type Kind = 'learn' | 'review' | 'chain';

export function Practice() {
  const { topic = '', level = '', grammar = '', type = '' } = useParams();
  const key = `${topic}/${level}/${grammar}/${type}`;
  const [params] = useSearchParams();
  const kind: Kind = params.get('chain') ? 'chain' : params.get('review') ? 'review' : 'learn';
  if (!findSession(key)) {
    return (
      <main className="summary">
        <p className="muted">This session is not available.</p>
        <Link to="/topics" className="link">
          Back to topics
        </Link>
      </main>
    );
  }
  // Remount when the session or the kind of run changes.
  return <PracticeRun key={`${key}:${kind}`} sessionKey={key} kind={kind} />;
}

function PracticeRun({ sessionKey, kind }: { sessionKey: string; kind: Kind }) {
  const ref = findSession(sessionKey)!;
  const { session, topic, level } = ref;
  const items = session.items;
  const store = useStore();
  const { state, settings, updateSettings } = store;
  const { speak, speaking } = useSpeaker();
  const topicUrl = `/topic/${topic.id}/${level.id}`;

  const base = level.targetReps;
  const target = kind === 'chain' ? 1 : kind === 'review' ? Math.max(2, base - 2) : base;
  const paragraph = session.type === 'paragraph';

  const saved = kind === 'learn' ? state.attempts[sessionKey] : undefined;
  const resumable = saved && saved.counts.length === items.length;
  const [counts, setCounts] = useState<number[]>(() => (resumable ? saved.counts : items.map(() => 0)));
  const [index, setIndex] = useState(() => (resumable ? Math.min(saved.index, items.length - 1) : 0));
  const [startedAt] = useState(() => (resumable ? saved.startedAt : Date.now()));
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [meaning, setMeaning] = useState(settings.showMeaning);
  const [nudge, setNudge] = useState('');
  const [ready, setReady] = useState(true);
  const [paceKey, setPaceKey] = useState(0);

  const item = items[index];
  const iKey = itemKey(sessionKey, item.id);
  const done = counts[index];
  const complete = done >= target;
  const mode: PracticeMode = settings.mode === 'speak' && !recognitionSupported ? 'read' : settings.mode;
  const targetWords = useMemo(() => normalizeWords(item.en), [item.en]);
  const paceMs = speakingTime(item.en) * (kind === 'chain' ? 0.8 : 1);

  // Persist the run so the learner can resume it later.
  useEffect(() => {
    if (kind !== 'learn' || finishedAt) return;
    if (counts.every((c) => c === 0) && index === 0) return;
    store.saveAttempt(sessionKey, { counts, index, startedAt, updatedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, index]);

  // Pace guard: in read-aloud mode the button waits about as long as saying the text takes.
  const armPace = useCallback(() => {
    if (!settings.paceGuard || mode !== 'read') return setReady(true);
    setReady(false);
    setPaceKey((k) => k + 1);
  }, [settings.paceGuard, mode]);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), paceMs);
    return () => window.clearTimeout(t);
  }, [ready, paceKey, paceMs]);

  useEffect(() => {
    armPace();
    setNudge('');
    if (settings.autoListen && kind !== 'chain') speak(item.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const addRep = useCallback(() => {
    setCounts((c) => c.map((v, i) => (i === index ? v + 1 : v)));
    store.rep(iKey);
    setNudge('');
    armPace();
  }, [index, iKey, store, armPace]);

  const repeat = () => {
    if (!ready) return setNudge('Say it aloud first.');
    addRep();
  };

  const finish = () => {
    // A chain round is extra practice; it never moves the review schedule.
    if (kind !== 'chain') store.complete(sessionKey);
    stopMic();
    setFinishedAt(Date.now());
  };

  const next = () => {
    if (settings.strict && !complete) return setNudge(`${target - done} more to go.`);
    if (index === items.length - 1) return finish();
    setIndex(index + 1);
    heardRef.current = '';
    setHeard('');
    setTyped('');
    setTypeResult(null);
  };

  // Speak mode: final phrases pile up until they match the sentence well enough.
  const [heard, setHeard] = useState('');
  const heardRef = useRef('');
  const onFinal = useCallback(
    (text: string) => {
      const words = normalizeWords(`${heardRef.current} ${text}`).slice(-targetWords.length * 2);
      if (align(targetWords, words).score >= 0.8) {
        addRep();
        heardRef.current = '';
      } else heardRef.current = words.join(' ');
      setHeard(heardRef.current);
    },
    [targetWords, addRep],
  );
  const { listening, interim, error: micError, start: startMic, stop: stopMic } = useRecognition(onFinal);
  useEffect(() => {
    if (mode !== 'speak' && listening) stopMic();
  }, [mode, listening, stopMic]);
  const heardWords = [...normalizeWords(heard), ...normalizeWords(interim)];
  const heardAlign = align(targetWords, heardWords);

  // Type mode
  const [typed, setTyped] = useState('');
  const [typeResult, setTypeResult] = useState<{ words: string[]; hit: boolean[] } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const check = () => {
    if (!typed.trim()) return;
    const words = normalizeWords(typed);
    const a = align(targetWords, words);
    if (a.exact) {
      addRep();
      setTyped('');
      setTypeResult(null);
    } else {
      setTypeResult({ words, hit: a.saidHit });
      setNudge(`${a.targetHit.filter(Boolean).length} of ${targetWords.length} words right.`);
    }
  };
  useEffect(() => {
    if (mode === 'type' && !complete) inputRef.current?.focus();
  }, [mode, index, complete]);

  // Memory fade: reviews start half faded; a chain round keeps first-letter hints.
  const hidden = !settings.fade || complete ? 0 : kind === 'chain' ? 0.75 : fadeFraction(done, target, kind === 'review' ? 0.5 : 0);

  if (finishedAt) {
    return <Summary sessionKey={sessionKey} kind={kind} counts={counts} elapsed={finishedAt - startedAt} />;
  }

  const mainButton = complete ? (
    <button className="btn btn-primary btn-lg repeat" onClick={next}>
      <span className="btn-label">
        {index === items.length - 1 ? 'Finish' : paragraph ? 'Next paragraph' : 'Next sentence'} <ArrowRight size={18} strokeWidth={1.75} />
      </span>
    </button>
  ) : mode === 'read' ? (
    <button className="btn btn-primary btn-lg repeat" onClick={repeat} aria-disabled={!ready}>
      {!ready && (
        <motion.span key={paceKey} className="pace" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: paceMs / 1000, ease: 'linear' }} />
      )}
      <span className="btn-label">Repeat</span>
    </button>
  ) : mode === 'speak' ? (
    <button className={`btn btn-primary btn-lg repeat${listening ? ' listening' : ''}`} onClick={() => (listening ? stopMic() : startMic())}>
      <span className="btn-label">
        {listening ? <MicOff size={18} strokeWidth={1.75} /> : <Mic size={18} strokeWidth={1.75} />}
        {listening ? 'Stop listening' : 'Start speaking'}
      </span>
    </button>
  ) : (
    <button className="btn btn-primary btn-lg repeat" onClick={check} disabled={!typed.trim()}>
      <span className="btn-label">Check</span>
    </button>
  );

  return (
    <div className="practice">
      <header className="p-top">
        <Link to={topicUrl} className="icon-btn" aria-label="Close practice">
          <X size={20} strokeWidth={1.5} />
        </Link>
        <div className="p-segs" aria-label={`Item ${index + 1} of ${items.length}`}>
          {items.map((it, i) => (
            <Line key={it.id} value={i < index ? 1 : i === index ? Math.min(done, target) : counts[i] >= target ? 1 : 0} max={i === index ? target : 1} />
          ))}
        </div>
        <span className="p-count">
          {index + 1} / {items.length}
        </span>
        <Segmented<PracticeMode>
          small
          label="Practice mode"
          value={mode}
          onChange={(m) => updateSettings({ mode: m })}
          options={[
            { value: 'read', label: 'Read' },
            { value: 'speak', label: 'Speak', disabled: !recognitionSupported },
            { value: 'type', label: 'Type' },
          ]}
        />
      </header>

      <main className="p-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="p-item"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.36, ease: EASE_OUT }}
          >
            {paragraph && item.title ? (
              <span className="p-title">{item.title}</span>
            ) : (
              <span className="p-pattern">{session.pattern}</span>
            )}

            <Sentence item={item} seed={iKey} hidden={hidden} paragraph={paragraph} onSpeak={(t) => speak(t)} />

            {mode === 'speak' && !complete && (
              <p className="heard" aria-live="polite">
                {micError ? (
                  <span className="heard-error">{micError}</span>
                ) : heardWords.length ? (
                  heardWords.map((w, i) => (
                    <span key={i} className={heardAlign.saidHit[i] ? 'hit' : ''}>
                      {w}{' '}
                    </span>
                  ))
                ) : listening ? (
                  'Listening…'
                ) : (
                  'Say the sentence. A rep counts when most words match.'
                )}
              </p>
            )}

            {mode === 'type' && !complete && (
              <>
                <textarea
                  ref={inputRef}
                  className="type-input"
                  rows={paragraph ? 4 : 1}
                  value={typed}
                  placeholder="Type what you hear and see"
                  spellCheck={false}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setTypeResult(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      check();
                    }
                  }}
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
              </>
            )}

            <AnimatePresence>
              {complete && (
                <motion.span
                  className="p-status"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                >
                  <Check size={16} strokeWidth={2} /> Said {done} {done === 1 ? 'time' : 'times'}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="meaning-wrap">
              <AnimatePresence initial={false}>
                {meaning && (
                  <motion.div
                    className="meaning"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                  >
                    <Bn className={`meaning-text${paragraph ? ' is-para' : ''}`}>{item.bn}</Bn>
                  </motion.div>
                )}
              </AnimatePresence>
              <button className={`meaning-toggle bn${meaning ? ' is-on' : ''}`} aria-pressed={meaning} onClick={() => setMeaning(!meaning)} lang="bn">
                বাংলা অর্থ
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-foot">
        <Dots done={Math.min(done, target)} total={target} />
        <div className="p-controls">
          <button className={`icon-btn ring${speaking ? ' is-on' : ''}`} onClick={() => speak(item.en)} aria-label="Listen">
            <Volume2 size={20} strokeWidth={1.5} />
          </button>
          {mainButton}
          {complete ? (
            mode === 'read' ? (
              <button className="btn btn-quiet" onClick={repeat}>
                <RotateCcw size={16} strokeWidth={1.5} /> Repeat again
              </button>
            ) : (
              <span />
            )
          ) : !settings.strict ? (
            <button className="btn btn-quiet" onClick={() => (index === items.length - 1 ? finish() : setIndex(index + 1))}>
              Skip
            </button>
          ) : (
            <span />
          )}
        </div>
        <span className="nudge" role="status">
          {nudge}
        </span>
      </footer>
    </div>
  );
}

function Summary({ sessionKey, kind, counts, elapsed }: { sessionKey: string; kind: Kind; counts: number[]; elapsed: number }) {
  const ref = findSession(sessionKey)!;
  const { state } = useStore();
  const next = nextSessionRef(sessionKey);
  const stat = state.sessions[sessionKey];
  const reps = counts.reduce((a, b) => a + b, 0);
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.round((elapsed % 60000) / 1000);
  const topicUrl = `/topic/${ref.topic.id}/${ref.level.id}`;

  return (
    <main className="summary">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r="44" fill="none" stroke="var(--accent-soft)" strokeWidth="4" />
        <motion.circle
          cx="48"
          cy="48"
          r="44"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
        <motion.path
          d="M32 49l11 11 21-23"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.55, ease: EASE_OUT }}
        />
      </svg>

      <motion.div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7, ease: EASE_OUT }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <h1 className="title">{kind === 'review' ? 'Review complete' : kind === 'chain' ? 'Round complete' : 'Session complete'}</h1>
          <p className="lede">
            {ref.topic.title} · {grammarLabel(ref.unit.grammar).title} · {typeLabel(ref.session.type).title}
          </p>
        </div>
        <div className="summary-figures">
          <div>
            <span className="figure">{reps}</span>
            <span className="small muted">reps</span>
          </div>
          <div>
            <span className="figure">{counts.length}</span>
            <span className="small muted">{ref.session.type === 'paragraph' ? 'paragraphs' : 'sentences'}</span>
          </div>
          <div>
            <span className="figure">
              {mins}:{String(secs).padStart(2, '0')}
            </span>
            <span className="small muted">minutes</span>
          </div>
        </div>
        {stat && kind !== 'chain' && (
          <p className="small muted">
            It comes back for review <span style={{ color: 'var(--ink)' }}>{dueLabel(stat).toLowerCase()}</span>.
          </p>
        )}
        <div className="summary-actions">
          {next ? (
            <Link to={practicePath(next.key)} className="btn btn-primary btn-lg">
              Next session <ArrowRight size={18} strokeWidth={1.75} />
            </Link>
          ) : (
            <Link to={topicUrl} className="btn btn-primary btn-lg">
              Back to topic
            </Link>
          )}
          {next && (
            <Link to={topicUrl} className="btn btn-quiet">
              Back to topic
            </Link>
          )}
        </div>
      </motion.div>
    </main>
  );
}
