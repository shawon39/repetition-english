import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './store';

// ---- Text to speech -------------------------------------------------------

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
export const ttsSupported = !!synth;

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!synth) return;
    const load = () => setVoices(synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')));
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

const PREFERRED = /Google US English|Samantha|Microsoft (Aria|Jenny|Guy)|Google UK English Female|Daniel/;

export function pickVoice(voices: SpeechSynthesisVoice[], uri: string | null) {
  return (
    voices.find((v) => v.voiceURI === uri) ??
    voices.find((v) => PREFERRED.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices[0]
  );
}

const isEnglish = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith('en');

/** Chrome fills the voice list after page load; wait for it (at most 1.5s). */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now.filter(isEnglish));
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done);
      window.clearTimeout(timer);
      resolve(synth.getVoices().filter(isEnglish));
    };
    const timer = window.setTimeout(done, 1500);
    synth.addEventListener('voiceschanged', done);
  });
}

/** Splits long text into sentences: network voices stop after about 15 seconds. */
function chunks(text: string) {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Held here so Chrome does not garbage-collect an utterance mid-sentence.
let queue: SpeechSynthesisUtterance[] = [];
let request = 0;

interface SayOptions {
  voiceURI: string | null;
  rate: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export async function say(text: string, { voiceURI, rate, onStart, onEnd }: SayOptions) {
  if (!synth) return;
  const id = ++request;
  synth.cancel();
  const voice = pickVoice(await loadVoices(), voiceURI);
  // Chrome silently drops an utterance queued right after cancel().
  await new Promise((r) => window.setTimeout(r, 50));
  if (id !== request) return; // a newer request replaced this one
  if (synth.paused) synth.resume();
  const parts = chunks(text);
  queue = parts.map((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = rate;
    if (i === 0) u.onstart = () => onStart?.();
    if (i === parts.length - 1) u.onend = () => onEnd?.();
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') console.warn('Speech failed:', e.error);
      onEnd?.();
    };
    return u;
  });
  queue.forEach((u) => synth.speak(u));
}

export function stopSpeaking() {
  request++;
  queue = [];
  synth?.cancel();
}

export function useSpeaker() {
  const { settings } = useStore();
  const [speaking, setSpeaking] = useState(false);
  // Read the latest settings at call time, so an effect that captured an
  // older speak() still uses the voice and speed chosen now.
  const latest = useRef(settings);
  latest.current = settings;

  const speak = useCallback((text: string, slow = false) => {
    const { voice, rate } = latest.current;
    void say(text, {
      voiceURI: voice,
      rate: slow ? Math.max(0.5, rate * 0.7) : rate,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  useEffect(() => () => stopSpeaking(), []);
  return { speak, stop, speaking };
}

// ---- Speech recognition ---------------------------------------------------

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

const Ctor: RecognitionCtor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
    : undefined;

export const recognitionSupported = !!Ctor;

/** Continuous English speech recognition. Calls onFinal for every finished phrase. */
export function useRecognition(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    wanted.current = true;
    if (!rec.current) {
      const r = new Ctor();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) onFinalRef.current(res[0].transcript);
          else text += res[0].transcript;
        }
        setInterim(text);
      };
      r.onend = () => {
        // Chrome stops after a pause. Keep listening until the learner stops.
        if (wanted.current) {
          try {
            r.start();
            return;
          } catch {
            /* fall through */
          }
        }
        setListening(false);
        setInterim('');
      };
      r.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        wanted.current = false;
        setError(e.error === 'not-allowed' ? 'Microphone access was blocked.' : `Speech error: ${e.error}`);
      };
      rec.current = r;
    }
    try {
      rec.current.start();
      setListening(true);
    } catch {
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  useEffect(
    () => () => {
      wanted.current = false;
      rec.current?.abort();
    },
    [],
  );

  return { listening, interim, error, start, stop };
}
