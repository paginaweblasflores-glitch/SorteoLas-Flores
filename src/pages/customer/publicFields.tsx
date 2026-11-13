import BirthDateField from './BirthDateField';
import ChoiceSelect from './ChoiceSelect';

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

export function LocationSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return <ChoiceSelect label={label} required value={value} options={options} onChange={onChange} placeholder="Selecciona tu distrito" />;
}

export function TaxiCompanyField({ question, value, onChange }: {
  question: Pregunta; value: string | string[] | undefined; onChange: (value: string) => void;
}) {
  const selectedValue = typeof value === 'string' ? value : '';
  const isOther = selectedValue === 'Otros' || selectedValue.startsWith('Otros: ');
  const otherComment = selectedValue.startsWith('Otros: ') ? selectedValue.slice('Otros: '.length) : '';

  return <div className="space-y-3">
    <ChoiceSelect label="Empresa de taxi" required={question.requerida} value={isOther ? 'Otros' : selectedValue} options={question.opciones} onChange={onChange} placeholder="Selecciona una empresa" />
    {isOther && <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>Comenta cuál empresa o modalidad *<input required={question.requerida} value={otherComment} onChange={(event) => onChange(`Otros: ${event.target.value}`)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>}
  </div>;
}

export function QuestionField({ question, value, onChange }: {
  question: Pregunta; value: string | string[] | undefined; onChange: (value: string | string[]) => void;
}) {
  const controlStyle = { background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' };
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium">{question.texto}{question.requerida ? ' *' : ' (opcional)'}</legend>
    {question.tipo === 'texto' ? <textarea value={typeof value === 'string' ? value : ''} required={question.requerida} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={controlStyle} /> : question.tipo === 'seleccion_unica' ? <ChoiceSelect hideLabel label={question.texto} required={question.requerida} value={typeof value === 'string' ? value : ''} options={question.opciones} onChange={onChange} /> : question.opciones.map((option) => {
      const checked = Array.isArray(value) ? value.includes(option) : value === option;
      return <label key={option} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-brand-muted)' }}><input type="checkbox" checked={checked} onChange={() => {
        const current = Array.isArray(value) ? value : [];
        onChange(checked ? current.filter((item) => item !== option) : [...current, option]);
      }} className="accent-yellow-500" />{option}</label>;
    })}
  </fieldset>;
}
export type Persona = {
  nombres: string; apellidos: string; telefono: string; departamento: string;
  provincia: string; distrito: string; fechaNacimiento: string; acepta: boolean;
};

/**
 * Campos de "Tus datos", iguales en todas las plantillas (actuales y futuras).
 * Provincia (Huamanga) y Departamento (Ayacucho) no se muestran: van fijos en `persona`
 * y se envían internamente junto con el distrito.
 */
export function ParticipantFields({ persona, setPersona, taxiCompanyQuestion, respuestas, setRespuestas }: {
  persona: Persona;
  setPersona: React.Dispatch<React.SetStateAction<Persona>>;
  taxiCompanyQuestion?: Pregunta;
  respuestas: Record<string, string | string[]>;
  setRespuestas: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PublicField label="Nombres" required value={persona.nombres} onChange={(value) => setPersona((p) => ({ ...p, nombres: value }))} />
      <PublicField label="Apellidos" required value={persona.apellidos} onChange={(value) => setPersona((p) => ({ ...p, apellidos: value }))} />
      <PublicField label="Celular (9 dígitos)" required type="tel" value={persona.telefono} maxLength={9} inputMode="numeric" onChange={(value) => setPersona((p) => ({ ...p, telefono: value.replace(/\D/g, '') }))} />
      <BirthDateField value={persona.fechaNacimiento} onChange={(iso) => setPersona((p) => ({ ...p, fechaNacimiento: iso }))} />
      <LocationSelect label="Distrito" value={persona.distrito} options={HUAMANGA_DISTRICTS} onChange={(value) => setPersona((p) => ({ ...p, distrito: value }))} />
      {taxiCompanyQuestion && (
        <TaxiCompanyField question={taxiCompanyQuestion} value={respuestas[taxiCompanyQuestion.id]} onChange={(value) => setRespuestas((previous) => ({ ...previous, [taxiCompanyQuestion.id]: value }))} />
      )}
    </div>
  );
}
