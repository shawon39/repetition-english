import { BookOpen, Briefcase, ChefHat, CloudSun, House, ShoppingBag, Sunrise, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const ICONS: Record<string, LucideIcon> = {
  'cloud-sun': CloudSun,
  house: House,
  briefcase: Briefcase,
  sunrise: Sunrise,
  'chef-hat': ChefHat,
  'shopping-bag': ShoppingBag,
};

/** The loop mark: a ring with one bead, the moment of "one more time". */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="50 12.83"
        transform="rotate(-60 16 16)"
      />
      <circle cx="14.78" cy="6.07" r="2.4" fill="var(--accent)" />
    </svg>
  );
}

export function TopicIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon] ?? BookOpen;
  return (
    <span className="tile-icon">
      <Icon size={size} strokeWidth={1.5} />
    </span>
  );
}

/** Fades a screen in and lifts it 8px. Every page uses it once, at its root. */
export function Page({ children, className = 'page' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: EASE_OUT }}
    >
      {children}
    </motion.main>
  );
}

/** List container and item that enter one after another, 40ms apart. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};
export const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: EASE_OUT } },
};

export function Line({ value, max = 1 }: { value: number; max?: number }) {
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <span className="line" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 0.48, ease: EASE_OUT }} />
    </span>
  );
}

export function Dots({ done, total }: { done: number; total: number }) {
  return (
    <span className="dots" aria-label={`${done} of ${total} repetitions`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="dot">
          {i < done && (
            <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }} />
          )}
        </span>
      ))}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  small = false,
  label,
}: {
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
  label: string;
}) {
  const id = useId();
  return (
    <span className={`seg${small ? ' sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'is-on' : ''}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.value === value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ duration: 0.28, ease: EASE_OUT }} />}
          <span className="seg-text">{o.label}</span>
        </button>
      ))}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Bn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bn ${className}`} lang="bn">
      {children}
    </span>
  );
}
