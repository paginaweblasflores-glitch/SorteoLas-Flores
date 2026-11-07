// Campos del formulario público, compartidos por las distintas presentaciones del sorteo.

export type Pregunta = {
  id: string;
  texto: string;
  tipo: 'texto' | 'seleccion_unica' | 'seleccion_multiple';
  opciones: string[];
  requerida: boolean;
};

export const HUAMANGA_DISTRICTS = [
  'Acocro', 'Acos Vinchos', 'Andrés Avelino Cáceres Dorregaray', 'Ayacucho',
  'Carmen Alto', 'Chiara', 'Jesús Nazareno', 'Ocros', 'Pacaycasa', 'Quinua',
  'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos',
  'Tambillo', 'Vinchos',
];

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function PublicField({ label, value, onChange, required = false, type = 'text', maxLength, inputMode }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}{required ? ' *' : ''}<input type={type} value={value} required={required} maxLength={maxLength} inputMode={inputMode} max={type === 'date' ? todayDate() : undefined} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>;
}

export function LocationValue({ label, value }: { label: string; value: string }) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}<input readOnly value={value} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>;
}

export function LocationSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }}>
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select></label>;
}

export function TaxiCompanyField({ question, value, onChange }: {
  question: Pregunta; value: string | string[] | undefined; onChange: (value: string) => void;
}) {
  const selectedValue = typeof value === 'string' ? value : '';
  const isOther = selectedValue === 'Otros' || selectedValue.startsWith('Otros: ');
  const otherComment = selectedValue.startsWith('Otros: ') ? selectedValue.slice('Otros: '.length) : '';

  return <div className="space-y-3">
    <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>Empresa de taxi *<select required={question.requerida} value={isOther ? 'Otros' : selectedValue} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }}>
      <option value="" disabled>Selecciona una empresa</option>
      {question.opciones.map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
    {isOther && <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>Comenta cuál empresa o modalidad *<input required={question.requerida} value={otherComment} onChange={(event) => onChange(`Otros: ${event.target.value}`)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>}
  </div>;
}

export function QuestionField({ question, value, onChange }: {
  question: Pregunta; value: string | string[] | undefined; onChange: (value: string | string[]) => void;
}) {
  const controlStyle = { background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' };
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium">{question.texto}{question.requerida ? ' *' : ' (opcional)'}</legend>
    {question.tipo === 'texto' ? <textarea value={typeof value === 'string' ? value : ''} required={question.requerida} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={controlStyle} /> : question.tipo === 'seleccion_unica' ? <select required={question.requerida} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={controlStyle}><option value="" disabled>Selecciona una opción</option>{question.opciones.map((option) => <option key={option} value={option}>{option}</option>)}</select> : question.opciones.map((option) => {
      const checked = Array.isArray(value) ? value.includes(option) : value === option;
      return <label key={option} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-brand-muted)' }}><input type="checkbox" checked={checked} onChange={() => {
        const current = Array.isArray(value) ? value : [];
        onChange(checked ? current.filter((item) => item !== option) : [...current, option]);
      }} className="accent-yellow-500" />{option}</label>;
    })}
  </fieldset>;
}