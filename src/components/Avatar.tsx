import { colorFromString, initials } from '@/lib/avatar';

interface Props {
  name: string;
  size?: number;
  ring?: boolean;
}

// Deterministic colored avatar circle with initials.
export default function Avatar({ name, size = 40, ring }: Props) {
  const [from, to] = colorFromString(name);
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-sm transition-transform duration-300 hover:scale-110 ${ring ? 'ring-2 ring-white' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
