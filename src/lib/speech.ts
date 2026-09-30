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

export function useSpeaker() {
  const { settings } = useStore();
  const voices = useVoices();
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text: string, slow = false) => {
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(voices, settings.voice);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? 'en-US';
      u.rate = slow ? Math.max(0.5, settings.rate * 0.7) : settings.rate;
      u.onstart = () => setSpeaking(true);
      u.onend = u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [voices, settings.voice, settings.rate],
  );

  const stop = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => synth?.cancel(), []);
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
