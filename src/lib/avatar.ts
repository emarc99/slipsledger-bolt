// Generates a consistent color from a string (name, id, etc).
// Returns a tailwind-friendly gradient pair.

const PALETTES: [string, string][] = [
  ['#b8893d', '#644822'], // brand gold
  ['#17b07f', '#0b5a45'], // accent green
  ['#3b82f6', '#1e3a8a'], // info blue
  ['#f59e0b', '#92400e'], // warning amber
  ['#ef4444', '#7f1d1d'], // error red
  ['#8b5cf6', '#4c1d95'], // violet
  ['#ec4899', '#831843'], // pink
  ['#06b6d4', '#155e75'], // cyan
];

export function colorFromString(s: string): [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return PALETTES[h % PALETTES.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
