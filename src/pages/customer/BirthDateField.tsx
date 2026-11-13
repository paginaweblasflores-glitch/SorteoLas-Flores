import { useEffect, useId, useRef, useState } from 'react';

/*
  Fecha de cumpleaños escrita a mano: día / mes / año (por ejemplo 13/07/1980).
  - Completa las barras solo y antepone el 0 cuando el número ya no puede crecer
    (día 4 → 04/, mes 2 → 02/). Con "/" también se cierra un número de una cifra (2/ → 02/).
  - No deja escribir valores imposibles: día 00 o mayor a 31, mes 00 o mayor a 12,
    años fuera de [año actual − 120, año actual] ni fechas futuras.
  - Entrega la fecha en formato ISO (AAAA-MM-DD) solo cuando es válida; si no, entrega ''.
*/

const MAX_AGE = 120;

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function isoToDisplay(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

type Parsed = { text: string; rejected: string };

/** Aplica las reglas carácter por carácter y devuelve el texto formateado y, si algo se rechazó, el motivo. */
function format(raw: string, currentYear: number): Parsed {
  const minYear = currentYear - MAX_AGE;
  const segs = ['', '', ''];
  let idx = 0;
  let rejected = '';

  for (const ch of raw) {
    if (/[/\-. ]/.test(ch)) {
      // Separador escrito a mano: cierra un día o mes de una cifra.
      if (idx < 2 && segs[idx].length === 1) {
        if (segs[idx] === '0') { rejected = idx === 0 ? 'El día no puede ser 0.' : 'El mes no puede ser 0.'; continue; }
        segs[idx] = `0${segs[idx]}`;
      }
      if (idx < 2 && segs[idx].length === 2) idx += 1;
      continue;
    }
    if (!/\d/.test(ch)) continue;

    if (idx === 0) {
      if (segs[0] === '') {
        if (ch > '3') { segs[0] = `0${ch}`; idx = 1; } else segs[0] = ch;
      } else {
        const day = Number(segs[0] + ch);
        if (day === 0) { rejected = 'El día no puede ser 00.'; continue; }
        if (day > 31) { rejected = 'El día va del 1 al 31.'; continue; }
        segs[0] += ch; idx = 1;
      }
    } else if (idx === 1) {
      if (segs[1] === '') {
        if (ch > '1') { segs[1] = `0${ch}`; idx = 2; } else segs[1] = ch;
      } else {
        const month = Number(segs[1] + ch);
        if (month === 0) { rejected = 'El mes no puede ser 00.'; continue; }
        if (month > 12) { rejected = 'El mes va del 1 al 12.'; continue; }
        segs[1] += ch; idx = 2;
      }
    } else if (segs[2].length < 4) {
      const next = segs[2] + ch;
      // El año debe poder terminar dentro del rango permitido.
      const low = Number(next.padEnd(4, '0'));
      const high = Number(next.padEnd(4, '9'));
      if (high < minYear || low > currentYear) { rejected = `El año debe estar entre ${minYear} y ${currentYear}.`; continue; }
      segs[2] = next;
    }
  }

  let text = segs[0];
  if (idx >= 1) text += `/${segs[1]}`;
  if (idx >= 2) text += `/${segs[2]}`;
  return { text, rejected };
}

/** Valida la fecha completa; devuelve el ISO o un mensaje de error. */
function validate(text: string, today: Date): { iso: string; error: string } {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { iso: '', error: text ? 'Escribe la fecha completa: día/mes/año (ej. 13/07/1980).' : '' };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const currentYear = today.getFullYear();
  if (year < currentYear - MAX_AGE || year > currentYear) return { iso: '', error: `El año debe estar entre ${currentYear - MAX_AGE} y ${currentYear}.` };
  if (day > daysInMonth(month, year)) return { iso: '', error: `Esa fecha no existe: ese mes tiene ${daysInMonth(month, year)} días.` };
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const todayIso = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (iso > todayIso) return { iso: '', error: 'La fecha no puede ser posterior a hoy.' };
  return { iso, error: '' };
}

export default function BirthDateField({ value, onChange, label = 'Fecha de cumpleaños', required = true }: {
  /** Fecha ISO (AAAA-MM-DD) o '' mientras no sea válida. */
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  required?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToDisplay(value));
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  // Si la fecha se limpia desde fuera (por ejemplo, al reiniciar el formulario), limpiar el campo.
  useEffect(() => {
    if (!value && validate(text, new Date()).iso) setText('');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = validate(text, new Date());
  // Errores de la fecha completa (p. ej. 30/02) se muestran al terminar de escribirla; los de "incompleta", al salir del campo.
  const shownError = message || (touched || text.length === 10 ? result.error : '');

  // Mensaje del navegador al intentar enviar ("Completa este campo" o el error de la fecha).
  useEffect(() => {
    inputRef.current?.setCustomValidity(text && result.error ? result.error : '');
  }, [text, result.error]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const deleting = raw.length < text.length;
    const parsed = format(raw, new Date().getFullYear());
    // Al borrar no se vuelve a agregar la barra final, para poder seguir borrando.
    const next = deleting ? parsed.text.replace(/\/$/, '') : parsed.text;
    setText(next);
    setMessage(parsed.rejected);
    const validated = validate(next, new Date());
    onChange(validated.iso);
  }

  return (
    <label htmlFor={id} className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>
      {label}{required ? ' *' : ''}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="13/07/1980"
        maxLength={10}
        required={required}
        value={text}
        onChange={handleChange}
        onBlur={() => { setTouched(true); setMessage(''); }}
        aria-invalid={Boolean(shownError) || undefined}
        aria-describedby={shownError ? `${id}-error` : `${id}-hint`}
        className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none tabular-nums tracking-wide"
        style={{ background: 'var(--color-brand-bg)', borderColor: shownError ? '#c0392b' : 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }}
      />
      {shownError
        ? <span id={`${id}-error`} role="alert" className="mt-1.5 block text-xs" style={{ color: '#b42318' }}>{shownError}</span>
        : <span id={`${id}-hint`} className="mt-1.5 block text-xs" style={{ color: 'var(--color-brand-muted)', opacity: 0.8 }}>Día / mes / año</span>}
    </label>
  );
}
