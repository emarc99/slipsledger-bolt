import { useEffect, useMemo, useState } from 'react';

interface Piece {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
  rotate: number;
}

const COLORS = ['#b8893d', '#17b07f', '#3b82f6', '#f59e0b', '#ef4444', '#cda35c'];

// Renders a short-lived burst of confetti pieces. Pass a `trigger` value that
// changes whenever you want a new burst (e.g. a counter or timestamp).
export default function ConfettiBurst({ trigger }: { trigger: number | string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger === 0 || trigger === '') return;
    setActive(false);
    const id = requestAnimationFrame(() => setActive(true));
    const t = setTimeout(() => setActive(false), 1100);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, [trigger]);

  const pieces = useMemo<Piece[]>(() => {
    if (!active) return [];
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 120,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      rotate: Math.random() * 360,
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block animate-confetti-fall rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
