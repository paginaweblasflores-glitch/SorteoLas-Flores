import { useEffect, useMemo, useState } from 'react';
import { FACETS } from './Star';

/*
  Guirnalda de pino dibujada en SVG: agujas, luces cálidas y esferas verdes y doradas.
  Se genera con una semilla fija (siempre igual) y se adapta al ancho de la pantalla
  para que la altura visible se mantenga cerca de 150–200 px.
*/

const HEIGHT = 200;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useGarlandWidth() {
  const compute = () => {
    const w = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const units = w < 768 ? w * 1.08 : w * 0.85;
    return Math.max(400, Math.round(units / 40) * 40);
  };
  const [width, setWidth] = useState(compute);
  useEffect(() => {
    let frame = 0;
    const onResize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setWidth(compute())); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, []);
  return width;
}

type Bauble = { x: number; y: number; r: number; tone: 'green' | 'gold' | 'red' | 'star' };

function buildGarland(width: number, withBaubles: boolean, seed: number) {
  const rand = mulberry32(seed);
  const spine = (x: number) => 34 + Math.sin(x / 95) * 7 + Math.sin(x / 41) * 3;

  // Base sólida: evita que el fondo blanco se vea entre las ramas.
  const edge: string[] = [`M-30 -20`];
  for (let x = -30; x <= width + 30; x += 10) edge.push(`L${x} ${(spine(x) + 4 + rand() * 12).toFixed(1)}`);
  edge.push(`L${width + 30} -20Z`);

  // Ramitas de pino: un tallo con agujas a ambos lados, en tres capas (fondo, medio, frente).
  type Layer = { step: number; minY: (x: number) => number; spanY: number; angle: [number, number]; length: [number, number]; palette: string[]; width: number };
  const layers: Layer[] = [
    { step: 8, minY: () => -6, spanY: 1, angle: [0.04, 0.92], length: [42, 30], palette: ['#123a1e', '#16441f', '#1a4c24'], width: 1.5 },
    { step: 7, minY: (x) => spine(x) - 16, spanY: 22, angle: [0.12, 0.76], length: [34, 26], palette: ['#1f5a2a', '#246331', '#2b6d36'], width: 1.4 },
    { step: 9, minY: (x) => spine(x) - 4, spanY: 18, angle: [0.22, 0.56], length: [24, 22], palette: ['#2f7537', '#3a8240', '#4a9248', '#5ea156'], width: 1.3 },
  ];
  const strokes: Array<{ color: string; width: number; d: string[] }> = [];
  for (const layer of layers) {
    const byColor = new Map<string, string[]>();
    for (let x = -40; x < width + 40; x += layer.step) {
      const ox = x + (rand() - 0.5) * layer.step;
      const oy = layer.spanY === 1 ? -6 + rand() * (spine(ox) + 6) : layer.minY(ox) + rand() * layer.spanY;
      const angle = (layer.angle[0] + rand() * layer.angle[1]) * Math.PI;
      const length = layer.length[0] + rand() * layer.length[1];
      const color = layer.palette[Math.floor(rand() * layer.palette.length)];
      const list = byColor.get(color) ?? [];
      const ex = ox + Math.cos(angle) * length;
      const ey = oy + Math.sin(angle) * length;
      list.push(`M${ox.toFixed(1)} ${oy.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      for (let d = 3; d < length; d += 3.2) {
        const px = ox + Math.cos(angle) * d;
        const py = oy + Math.sin(angle) * d;
        const needle = (11 + rand() * 5) * (1 - (d / length) * 0.55);
        for (const side of [-1, 1]) {
          const a = angle + side * (0.78 + rand() * 0.2);
          list.push(`M${px.toFixed(1)} ${py.toFixed(1)}l${(Math.cos(a) * needle).toFixed(1)} ${(Math.sin(a) * needle).toFixed(1)}`);
        }
      }
      byColor.set(color, list);
    }
    for (const [color, d] of byColor) strokes.push({ color, width: layer.width, d });
  }

  // Cable de luces con caídas suaves.
  const span = 260;
  const wire: string[] = [];
  const lights: Array<{ x: number; y: number }> = [];
  for (let start = -span / 2; start < width + span; start += span) {
    const x0 = start; const x1 = start + span;
    const y0 = spine(x0) + 8; const y1 = spine(x1) + 8;
    const cx = (x0 + x1) / 2; const cy = Math.max(y0, y1) + 40;
    wire.push(`M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`);
    for (let t = 0.12; t < 1; t += 0.19) {
      const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
      const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
      lights.push({ x: px, y: py });
    }
  }

  // Esferas: enmarcan los costados y dejan libre el centro, como en un afiche.
  const baubles: Bauble[] = [];
  if (withBaubles) {
    const narrow = width < 900;
    const spots: Array<[number, number, number, Bauble['tone']]> = narrow
      ? [[0.12, 112, 32, 'green'], [0.05, 168, 20, 'red'], [0.3, 94, 15, 'gold'], [0.7, 92, 20, 'star'], [0.9, 120, 40, 'red']]
      : [[0.04, 120, 40, 'red'], [0.11, 104, 32, 'green'], [0.075, 182, 22, 'red'], [0.19, 140, 22, 'star'], [0.8, 132, 24, 'star'], [0.875, 100, 30, 'gold'], [0.955, 128, 44, 'red']];
    for (const [fx, y, r, tone] of spots) baubles.push({ x: fx * width, y, r, tone });
  }

  return { base: edge.join(''), strokes: strokes.map((stroke) => ({ ...stroke, d: stroke.d.join('') })), wire: wire.join(''), lights, baubles, spine };
}

function GarlandSvg({ flip = false, withBaubles = true, seed }: { flip?: boolean; withBaubles?: boolean; seed: number }) {
  const width = useGarlandWidth();
  const garland = useMemo(() => buildGarland(width, withBaubles, seed), [width, withBaubles, seed]);
  const id = `g${seed}`;
  const height = withBaubles ? HEIGHT : 112;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" aria-hidden="true" focusable="false" style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="#ffe7a3" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffd36b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffd36b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-green`} cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#7fd067" />
          <stop offset="38%" stopColor="#2f9638" />
          <stop offset="100%" stopColor="#0b4416" />
        </radialGradient>
        <radialGradient id={`${id}-gold`} cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffe9a6" />
          <stop offset="40%" stopColor="#d8a53c" />
          <stop offset="100%" stopColor="#7c4f0b" />
        </radialGradient>
        <radialGradient id={`${id}-red`} cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ff8a7a" />
          <stop offset="38%" stopColor="#d8222a" />
          <stop offset="100%" stopColor="#6e0a10" />
        </radialGradient>
        <linearGradient id={`${id}-starlit`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1b8" />
          <stop offset="55%" stopColor="#e9bf4f" />
          <stop offset="100%" stopColor="#b9851f" />
        </linearGradient>
        <linearGradient id={`${id}-starshade`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a63a" />
          <stop offset="100%" stopColor="#8a5c10" />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" x2="1">
          <stop offset="0%" stopColor="#8a6420" />
          <stop offset="50%" stopColor="#f1d28a" />
          <stop offset="100%" stopColor="#8a6420" />
        </linearGradient>
      </defs>
      <g transform={flip ? `translate(0 ${height}) scale(1 -1)` : undefined}>
        <path d={garland.base} fill="#11351c" />
        <g strokeLinecap="round" fill="none">
          {garland.strokes.map((stroke, i) => <path key={i} d={stroke.d} stroke={stroke.color} strokeWidth={stroke.width} />)}
        </g>
        <path d={garland.wire} fill="none" stroke="#7a5a2a" strokeWidth="0.9" opacity="0.8" />
        {garland.lights.map((l, i) => (
          <g key={`l${i}`}>
            <circle cx={l.x} cy={l.y} r="9" fill={`url(#${id}-glow)`} className="nav-twinkle" style={{ animationDelay: `${-((i * 0.73) % 3.2)}s`, animationDuration: `${2.6 + (i % 4) * 0.45}s` }} />
            <circle cx={l.x} cy={l.y} r="1.9" fill="#fff8de" />
          </g>
        ))}
        {garland.baubles.map((b, i) => (
          <g key={`b${i}`} className="nav-sway" style={{ transformOrigin: `${b.x}px ${garland.spine(b.x)}px`, animationDelay: `${-i * 1.3}s`, animationDuration: `${4.8 + (i % 3) * 0.9}s` }}>
            <line x1={b.x} y1={garland.spine(b.x) + 10} x2={b.x} y2={b.y - b.r - 4} stroke="#b08a3e" strokeWidth="1.2" />
            {b.tone === 'star' ? (
              <g transform={`translate(${b.x - b.r} ${b.y - b.r}) scale(${(b.r * 2) / 100}) rotate(8 50 52)`}>
                {FACETS.map((facet, k) => <path key={k} d={facet.d} fill={`url(#${id}-${facet.lit ? 'starlit' : 'starshade'})`} stroke="#a77617" strokeWidth="0.5" strokeLinejoin="round" />)}
              </g>
            ) : (
              <>
                <rect x={b.x - b.r * 0.28} y={b.y - b.r - 7} width={b.r * 0.56} height={b.r * 0.32} rx="2" fill={`url(#${id}-cap)`} />
            <circle cx={b.x} cy={b.y} r={b.r} fill={`url(#${id}-${b.tone})`} />
            <ellipse cx={b.x - b.r * 0.34} cy={b.y - b.r * 0.38} rx={b.r * 0.26} ry={b.r * 0.15} fill="#fff" opacity="0.55" transform={`rotate(-35 ${b.x - b.r * 0.34} ${b.y - b.r * 0.38})`} />
              </>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

export function GarlandTop() {
  return <GarlandSvg seed={1225} />;
}

export function GarlandBottom() {
  return <GarlandSvg seed={2512} flip withBaubles={false} />;
}
