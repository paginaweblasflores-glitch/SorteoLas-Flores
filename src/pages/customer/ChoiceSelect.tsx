import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  Selector propio para el formulario público, en lugar del <select> del sistema.
  Solo se elige de la lista (sin buscador).
  - Celular (< 640 px): hoja que sube desde abajo con opciones grandes.
  - Escritorio: lista desplegable bajo el campo (o encima, si no hay espacio).
  Se dibuja sobre toda la página (portal), así no la recortan las secciones con cortes
  diagonales, y copia los colores de la plantilla (--color-brand-* y --choice-accent).
*/

const NARROW = '(max-width: 639px)';
const THEME_VARS = ['--color-brand-bg', '--color-brand-border', '--color-brand-cream', '--color-brand-muted', '--choice-accent-color', '--font-body'];

type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export default function ChoiceSelect({ label, value, options, onChange, required = false, placeholder = 'Selecciona una opción', hideLabel = false }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Oculta la etiqueta visible (sigue disponible para lectores de pantalla). */
  hideLabel?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(NARROW).matches);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [theme, setTheme] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  function measure() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const wanted = Math.min(296, options.length * 46 + 10);
    if (below >= Math.min(wanted, 220) || below >= above) {
      setPlacement({ left: rect.left, width: rect.width, top: rect.bottom + 6, maxHeight: Math.max(160, Math.min(296, below)) });
    } else {
      setPlacement({ left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 6, maxHeight: Math.max(160, Math.min(296, above)) });
    }
  }

  function openPanel() {
    const styles = rootRef.current ? getComputedStyle(rootRef.current) : null;
    if (styles) {
      setTheme(Object.fromEntries(THEME_VARS.map((name) => [name, styles.getPropertyValue(name)]).filter(([, v]) => v)) as React.CSSProperties);
    }
    setActive(Math.max(0, options.indexOf(value)));
    measure();
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(option: string) {
    onChange(option);
    close();
  }

  // Al abrir: foco en la lista y la opción elegida a la vista.
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!narrow && !panelRef.current?.contains(target) && !rootRef.current?.contains(target)) close(false);
    }
    function onViewportChange() { if (!narrow) measure(); }
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    const previousOverflow = document.body.style.overflow;
    if (narrow) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, narrow]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); return; }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); return; }
    if (event.key === 'End') { event.preventDefault(); setActive(options.length - 1); return; }
    if ((event.key === 'Enter' || event.key === ' ') && options[active]) { event.preventDefault(); choose(options[active]); return; }
    if (event.key === 'Tab') close(false);
  }

  const listbox = (
    <ul
      ref={listRef}
      id={`${id}-list`}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={`${id}-label`}
      aria-activedescendant={options[active] ? `${id}-opt-${active}` : undefined}
      onKeyDown={onKeyDown}
      className="choice-list"
      style={!narrow && placement ? { maxHeight: placement.maxHeight } : undefined}
    >
      {options.map((option, index) => {
        const selected = option === value;
        return (
          <li
            key={option}
            id={`${id}-opt-${index}`}
            data-index={index}
            role="option"
            aria-selected={selected}
            data-active={index === active || undefined}
            onPointerEnter={() => setActive(index)}
            onClick={() => choose(option)}
            className="choice-option"
          >
            <span className="min-w-0 flex-1">{option}</span>
            {selected && (
              <svg viewBox="0 0 24 24" className="choice-check h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            )}
          </li>
        );
      })}
    </ul>
  );

  const panel = open && (narrow ? (
    <div className="choice-sheet-backdrop" style={theme} onClick={() => close()}>
      <div ref={panelRef} className="choice-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-sheet-title`} onClick={(event) => event.stopPropagation()}>
        <div className="choice-sheet-handle" aria-hidden="true" />
        <div className="choice-sheet-head">
          <p id={`${id}-sheet-title`} className="choice-sheet-title">{label}</p>
          <button type="button" onClick={() => close()} className="choice-close" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {listbox}
      </div>
    </div>
  ) : placement && (
    <div ref={panelRef} className="choice-popover" style={{ ...theme, left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom }}>
      {listbox}
    </div>
  ));

  return (
    <div ref={rootRef} className="choice relative">
      <span id={`${id}-label`} className={hideLabel ? 'sr-only' : 'block text-xs'} style={{ color: 'var(--color-brand-muted)' }}>{label}{required ? ' *' : ''}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); openPanel(); }
        }}
        className="choice-trigger"
        data-open={open || undefined}
      >
        <span id={`${id}-value`} className={value ? 'choice-value' : 'choice-placeholder'}>{value || placeholder}</span>
        <svg viewBox="0 0 24 24" className="choice-chevron h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {/* Mantiene la validación nativa del formulario ("Completa este campo"). */}
      <input tabIndex={-1} aria-hidden="true" className="choice-native" value={value} required={required} onChange={() => {}} onFocus={() => triggerRef.current?.focus()} />
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
