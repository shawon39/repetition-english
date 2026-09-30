import { Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chunkSentence, fadeOrder, tokenize, wordCount, type Token } from '../lib/text';
import type { Gloss, Item } from '../lib/types';
import { Bn } from './ui';

interface Props {
  item: Item;
  seed: string;
  /** 0 = full text, 1 = every word hidden. */
  hidden: number;
  showBangla: boolean;
  peek?: boolean;
  paragraph?: boolean;
  onSpeak?: (text: string) => void;
}

export function Sentence({ item, seed, hidden, showBangla, peek = false, paragraph = false, onSpeak }: Props) {
  const tokens = useMemo(() => tokenize(item.en), [item.en]);
  const chunks = useMemo(() => chunkSentence(tokens, item.words), [tokens, item.words]);
  const order = useMemo(() => fadeOrder(tokens, item.words, seed), [tokens, item.words, seed]);
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLParagraphElement>(null);

  const hiddenSet = useMemo(() => new Set(order.slice(0, Math.round(order.length * hidden))), [order, hidden]);
  const allHidden = hidden >= 1;

  useEffect(() => setOpen(null), [item.en]);
  // Hand focus back to the page so shortcuts like Space keep working.
  const close = () => {
    setOpen(null);
    if (root.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  };
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), close());
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const n = wordCount(item.en);
  const size = paragraph ? 'para' : n <= 8 ? 'xl' : n <= 14 ? 'lg' : 'md';

  // Every word keeps the same markup so hiding it can animate.
  const renderToken = (t: Token, key: number) => {
    if (t.word < 0) return <span key={key}>{t.text}</span>;
    const isHidden = hiddenSet.has(t.word);
    return (
      <span key={key} className={`w${isHidden ? ' is-hidden' : ''}${isHidden && allHidden ? ' no-hint' : ''}`}>
        <span className="w-h">{t.text[0]}</span>
        <span className="w-g">{t.text.slice(1)}</span>
      </span>
    );
  };

  return (
    <p
      ref={root}
      className={`sentence size-${size}${showBangla ? ' with-bn' : ''}${peek ? ' peek' : ''}`}
      lang="en"
    >
      {chunks.map((chunk, ci) =>
        chunk.kind === 'text' ? (
          chunk.tokens.map((t, ti) => renderToken(t, ci * 1000 + ti))
        ) : (
          <span key={ci} className={`gloss${open === ci ? ' is-open' : ''}`}>
            <button
              type="button"
              className="gloss-word"
              aria-expanded={open === ci}
              aria-label={`Meaning of ${chunk.gloss.w}`}
              onClick={() => setOpen(open === ci ? null : ci)}
            >
              {chunk.tokens.map((t, ti) => renderToken(t, ti))}
            </button>
            {showBangla && <Bn className="gloss-bn">{chunk.gloss.bn.split(',')[0]}</Bn>}
            {open === ci && <WordCard gloss={chunk.gloss} onClose={close} onSpeak={onSpeak} />}
          </span>
        ),
      )}
    </p>
  );
}

function WordCard({ gloss, onClose, onSpeak }: { gloss: Gloss; onClose: () => void; onSpeak?: (t: string) => void }) {
  return (
    <span className="word-card" role="dialog" aria-label={gloss.w} onClick={(e) => e.stopPropagation()}>
      <span className="word-card-head">
        <span className="word-card-word">{gloss.w}</span>
        <span className="pos">{gloss.pos}</span>
        <span className="spacer" />
        {onSpeak && (
          <button type="button" className="icon-btn sm" onClick={() => onSpeak(gloss.w)} aria-label="Listen">
            <Volume2 size={16} />
          </button>
        )}
        <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </span>
      {gloss.base && (
        <span className="word-card-base">
          from <b>{gloss.base}</b>
        </span>
      )}
      <Bn className="word-card-bn">{gloss.bn}</Bn>
    </span>
  );
}
