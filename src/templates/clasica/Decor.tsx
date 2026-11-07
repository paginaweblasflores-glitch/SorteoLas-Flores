/*
  Decoración de la plantilla Clásica: papelería fina.
  Un filete doble con un rombo al centro (arriba y abajo) y una pequeña viñeta floral sobre el título.
*/

function Rule() {
  return (
    <svg viewBox="0 0 320 14" className="mx-auto block h-auto w-[220px] sm:w-[280px]" aria-hidden="true" focusable="false">
      <g stroke="var(--ev-accent)" strokeWidth="1" fill="none">
        <path d="M0 5h140M0 9h140M180 5h140M180 9h140" />
        <path d="M160 1l6 6-6 6-6-6z" fill="var(--ev-accent)" />
      </g>
    </svg>
  );
}

export function ClassicTop() {
  return <div className="px-5 pt-10 sm:pt-14"><Rule /></div>;
}

export function ClassicBottom() {
  return <div className="px-5 pb-12 pt-6"><Rule /></div>;
}

/** Viñeta floral sobre el título. */
export function ClassicOrnament() {
  return (
    <svg viewBox="0 0 64 28" className="mx-auto block h-auto w-14" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--ev-accent)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M32 24c0-8 0-12 0-18" />
        <path d="M32 16c-6-1-11-5-13-11 6 0 11 4 13 11Z" fill="var(--ev-accent)" fillOpacity="0.18" />
        <path d="M32 16c6-1 11-5 13-11-6 0-11 4-13 11Z" fill="var(--ev-accent)" fillOpacity="0.18" />
        <path d="M4 22h18M42 22h18" />
      </g>
      <circle cx="32" cy="4" r="2.2" fill="var(--ev-accent)" />
    </svg>
  );
}
