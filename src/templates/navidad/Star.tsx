/* Estrella dorada con facetas (aspecto 3D) y las estrellas decorativas de los costados. */

const POINTS = 5;
const OUTER = 50;
const INNER = 21;

function vertex(i: number, radius: number) {
  const angle = -Math.PI / 2 + (i * Math.PI) / POINTS;
  return [50 + Math.cos(angle) * radius, 52 + Math.sin(angle) * radius] as const;
}

/** Cada punta se divide en dos caras: una iluminada y otra en sombra. */
export const FACETS = Array.from({ length: POINTS * 2 }, (_, i) => {
  const a = vertex(i, i % 2 === 0 ? OUTER : INNER);
  const b = vertex(i + 1, (i + 1) % 2 === 0 ? OUTER : INNER);
  return { d: `M50 52L${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}Z`, lit: i % 2 === 0 };
});

export function GoldStar({ size = 64, rotate = 0, className = '', style }: { size?: number; rotate?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 104" width={size} height={size * 1.04} className={className} style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="star-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1b8" />
          <stop offset="55%" stopColor="#e9bf4f" />
          <stop offset="100%" stopColor="#b9851f" />
        </linearGradient>
        <linearGradient id="star-shade" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a63a" />
          <stop offset="100%" stopColor="#8a5c10" />
        </linearGradient>
      </defs>
      {FACETS.map((facet, i) => <path key={i} d={facet.d} fill={facet.lit ? 'url(#star-lit)' : 'url(#star-shade)'} stroke="#a77617" strokeWidth="0.4" strokeLinejoin="round" />)}
    </svg>
  );
}

/** Estrella grande que asoma por el borde de la pantalla junto a un título de sección. */
export function StarAccents({ slot }: { slot: 'premios' | 'participa' }) {
  const left = slot === 'premios';
  return (
    <GoldStar
      size={92}
      rotate={left ? -18 : 14}
      className="nav-drift pointer-events-none absolute -top-6 sm:-top-10 sm:h-auto sm:w-[124px]"
      style={left ? { left: 'calc(50% - 50vw - 30px)' } : { right: 'calc(50% - 50vw - 42px)', top: '-3.5rem' }}
    />
  );
}

/** Estrella centrada sobre el título. */
export function TitleStar() {
  return <GoldStar size={64} className="nav-shine mx-auto block sm:h-auto sm:w-[76px]" />;
}
