import { Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chunkSentence, fadeOrder, tokenize, wordCount, type Token } from '../lib/text';
import type { Gloss, Item } from '../lib/types';
import { Bn, EASE_OUT } from './ui';

interface Props {
  item: Item;
  seed: string;
  /** 0 = full text, 1 = every word hidden. */
  hidden: number;
  paragraph?: boolean;
  onSpeak?: (text: string) => void;
}

export function Sentence({ item, seed, hidden, paragraph = false, onSpeak }: Props) {
  const tokens = useMemo(() => tokenize(item.en), [item.en]);
  const chunks = useMemo(() => chunkSentence(tokens, item.words), [tokens, item.words]);
  const order = useMemo(() => fadeOrder(tokens, item.words, seed), [tokens, item.words, seed]);
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLParagraphElement>(null);

  const hiddenSet = useMemo(() => new Set(order.slice(0, Math.round(order.length * hidden))), [order, hidden]);
  const allHidden = hidden >= 1;

  useEffect(() => setOpen(null), [item.en]);
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const n = wordCount(item.en);
  const size = paragraph ? 'para' : n <= 8 ? 'xl' : n <= 16 ? 'lg' : 'md';

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
    <p ref={root} className={`sentence size-${size}`} lang="en">
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
            <AnimatePresence>
              {open === ci && <WordPopover key="pop" gloss={chunk.gloss} onSpeak={onSpeak} />}
            </AnimatePresence>
          </span>
        ),
      )}
    </p>
  );
}

function WordPopover({ gloss, onSpeak }: { gloss: Gloss; onSpeak?: (t: string) => void }) {
  return (
    <motion.span
      className="popover"
      role="dialog"
      aria-label={`Meaning of ${gloss.w}`}
      initial={{ opacity: 0, y: 4, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 4, x: '-50%' }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
    >
      <span className="popover-head">
        <span className="popover-word">{gloss.w}</span>
        {onSpeak && (
          <button type="button" className="icon-btn" onClick={() => onSpeak(gloss.w)} aria-label={`Listen to ${gloss.w}`}>
            <Volume2 size={16} strokeWidth={1.5} />
          </button>
        )}
      </span>
      <span className="popover-pos">
        {gloss.pos}
        {gloss.base && ` · from ${gloss.base}`}
      </span>
      <Bn className="popover-bn">{gloss.bn}</Bn>
    </motion.span>
  );
}
