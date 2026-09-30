import {
  Briefcase,
  ChefHat,
  CloudSun,
  House,
  ShoppingBag,
  Sunrise,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { typeLabel } from '../lib/content';
import type { SessionType } from '../lib/types';

const ICONS: Record<string, LucideIcon> = {
  'cloud-sun': CloudSun,
  house: House,
  briefcase: Briefcase,
  sunrise: Sunrise,
  'chef-hat': ChefHat,
  'shopping-bag': ShoppingBag,
};

export const topicStyle = (topic: string) => ({ '--topic': `var(--topic-${topic})` }) as CSSProperties;

export function TopicIcon({ topic, icon, size = 44 }: { topic: string; icon: string; size?: number }) {
  const Icon = ICONS[icon] ?? BookOpen;
  return (
    <span className="topic-icon" style={{ ...topicStyle(topic), width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  );
}

export function TypeChip({ type, full = false }: { type: SessionType; full?: boolean }) {
  const label = typeLabel(type);
  return (
    <span className="type-chip" style={{ '--type': `var(--type-${type})` } as CSSProperties}>
      <span className="type-dot" />
      {full ? label.title : label.short}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Bn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bn ${className}`} lang="bn">
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
    </label>
  );
}

export function ProgressBar({ value, max, tone = 'primary' }: { value: number; max: number; tone?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className={`bar bar-${tone}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <span className="bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Circular progress. With `segments`, the ring is split into equal parts. */
export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  segments,
  tone = 'primary',
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  segments?: number;
  tone?: 'primary' | 'rep' | 'good';
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  const gap = segments && segments > 1 ? Math.min(10, c / segments / 4) : 0;
  const seg = segments ? c / segments : c;
  return (
    <span className={`ring ring-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments ? (
            Array.from({ length: segments }, (_, i) => (
              <circle
                key={i}
                className={i < value ? 'ring-seg on' : 'ring-seg'}
                cx={size / 2}
                cy={size / 2}
                r={r}
                strokeWidth={stroke}
                strokeDasharray={`${seg - gap} ${c - seg + gap}`}
                strokeDashoffset={-i * seg - gap / 2}
                strokeLinecap="round"
              />
            ))
          ) : (
            <>
              <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
              <circle
                className="ring-fill"
                cx={size / 2}
                cy={size / 2}
                r={r}
                strokeWidth={stroke}
                strokeDasharray={`${c * pct} ${c}`}
                strokeLinecap="round"
              />
            </>
          )}
        </g>
      </svg>
      {children && <span className="ring-center">{children}</span>}
    </span>
  );
}
