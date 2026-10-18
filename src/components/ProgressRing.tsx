import { useCountUp } from '@/hooks/useCountUp';

interface Props {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  format?: (v: number) => string;
}

// Animated circular progress ring. Stroke draws from 0 to the target fraction.
export default function ProgressRing({
  value,
  size = 132,
  stroke = 12,
  label,
  caption,
  format,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);
  const animated = useCountUp(clamped, 1100);
  const display = format ? format(animated) : `${Math.round(animated * 100)}%`;

  const tone =
    clamped >= 1
      ? { stroke: '#17b07f', glow: 'drop-shadow(0 0 8px rgba(23,176,127,.45))' }
      : clamped >= 0.5
        ? { stroke: '#b8893d', glow: 'drop-shadow(0 0 6px rgba(184,137,61,.35))' }
        : { stroke: '#ef4444', glow: 'drop-shadow(0 0 6px rgba(239,68,68,.3))' };

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e2db"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)',
            filter: tone.glow,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="amount text-xl font-bold text-surface-900">{display}</p>
          {label && <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-surface-400">{label}</p>}
        </div>
      </div>
      {caption && (
        <p className="absolute -bottom-6 left-0 right-0 text-center text-xs text-surface-500">{caption}</p>
      )}
    </div>
  );
}
