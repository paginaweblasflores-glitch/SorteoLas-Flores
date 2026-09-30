import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import BrandWordmark from '../../components/BrandWordmark';

type Pregunta = {
  id: string;
  texto: string;
  tipo: 'texto' | 'seleccion_unica' | 'seleccion_multiple';
  opciones: string[];
  requerida: boolean;
};

type Sorteo = {
  id: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'pendiente' | 'finalizado';
  imagen_url: string | null;
  premio_nombre: string | null;
  premio_descripcion: string | null;
};

type DatosParticipante = {
  nombres: string;
  apellidos: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  provincia: string;
  distrito: string;
  fechaNacimiento: string;
  acepta: boolean;
};

const EMPTY_PERSON: DatosParticipante = {
  nombres: '', apellidos: '', telefono: '', ciudad: 'Ayacucho', departamento: 'Ayacucho',
  provincia: 'Huamanga', distrito: 'Ayacucho', fechaNacimiento: '', acepta: false,
};

const PERU_MAIN_CITIES = [
  'Abancay', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cerro de Pasco',
  'Chachapoyas', 'Chiclayo', 'Chimbote', 'Chincha Alta', 'Cusco', 'Huacho',
  'Huancavelica', 'Huancayo', 'Huánuco', 'Huaraz', 'Ica', 'Iquitos', 'Juliaca',
  'Lima', 'Moquegua', 'Moyobamba', 'Nazca', 'Piura', 'Pisco', 'Pucallpa',
  'Puerto Maldonado', 'Puno', 'Sullana', 'Tacna', 'Talara', 'Tarapoto',
  'Tingo María', 'Trujillo', 'Tumbes',
];
const HUAMANGA_DISTRICTS = [
  'Acocro', 'Acos Vinchos', 'Andrés Avelino Cáceres Dorregaray', 'Ayacucho',
  'Carmen Alto', 'Chiara', 'Jesús Nazareno', 'Ocros', 'Pacaycasa', 'Quinua',
  'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos',
  'Tambillo', 'Vinchos',
];
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function statusFor(sorteo: Sorteo) {
  if (sorteo.estado === 'finalizado' || todayDate() > sorteo.fecha_fin) return 'finalizado';
  if (todayDate() < sorteo.fecha_inicio) return 'pendiente';
  return sorteo.estado;
}

export default function SorteoPublico({ slug, onOpenLegal }: {
  slug: string | null;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
}) {
  const [sorteo, setSorteo] = useState<Sorteo | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [persona, setPersona] = useState(EMPTY_PERSON);
  const [respuestas, setRespuestas] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const raffleQuery = supabase.from('sorteos')
        .select('id,nombre,descripcion,fecha_inicio,fecha_fin,estado,imagen_url,premio_nombre,premio_descripcion');
      const { data, error: raffleError } = slug
        ? await raffleQuery.eq('slug', slug).in('estado', ['activo', 'finalizado']).maybeSingle()
        : await raffleQuery.eq('estado', 'activo').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (raffleError || !data) {
        setLoading(false);
        return;
      }
      const { data: questionRows, error: questionError } = await supabase
        .from('sorteo_preguntas')
        .select('id,texto,tipo,opciones,requerida')
        .eq('sorteo_id', data.id)
        .eq('activa', true)
        .order('orden');
      if (cancelled) return;
      setSorteo(data as Sorteo);
      setPreguntas(questionError ? [] : (questionRows ?? []) as Pregunta[]);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sorteo || !supabase) return;
    setError('');
    if (!persona.acepta) {
      setError('Debes aceptar los términos y la política de privacidad.');
      return;
    }
    for (const question of preguntas) {
      const value = respuestas[question.id];
      const empty = Array.isArray(value) ? value.length === 0 : !value?.trim();
      if (question.requerida && empty) {
        setError(`Completa la pregunta: ${question.texto}`);
        return;
      }
    }
    setSaving(true);
    const { error: saveError } = await supabase.rpc('registrar_participacion', {
      p_slug: slug,
      p_nombres: persona.nombres.trim(),
      p_apellidos: persona.apellidos.trim(),
      p_telefono: persona.telefono,
      p_ciudad: persona.ciudad.trim(),
      p_departamento: persona.departamento,
      p_provincia: persona.provincia,
      p_distrito: persona.distrito,
      p_fecha_nacimiento: persona.fechaNacimiento,
      p_acepta_terminos: persona.acepta,
      p_respuestas: respuestas,
      p_request_id: requestId,
    });
    setSaving(false);
    if (saveError) {
      if (saveError.code === '23505') {
        setError('Este teléfono ya registró una participación en este sorteo.');
      } else if (saveError.message.includes('finalizado') || saveError.message.includes('no está abierto')) {
        setSorteo((current) => current ? { ...current, estado: 'finalizado' } : current);
      } else {
        setError('No se pudo guardar tu participación. Verifica tus datos e inténtalo nuevamente.');
      }
      return;
    }
    setSuccess(true);
  }

  const state = sorteo ? statusFor(sorteo) : 'pendiente';
  const closed = state === 'finalizado';
  const notStarted = state === 'pendiente';
  const taxiCompanyQuestion = preguntas.find((question) => question.tipo === 'seleccion_unica' && question.opciones.includes('Independiente'));
  const additionalQuestions = preguntas.filter((question) => question.id !== taxiCompanyQuestion?.id);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-brand-bg)', color: 'var(--color-brand-cream)', fontFamily: 'var(--font-body)' }}>
      <header className="border-b px-4 py-3" style={{ borderColor: 'var(--color-brand-border)' }}>
        <div className="mx-auto flex max-w-5xl justify-center"><BrandWordmark /></div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {loading ? <p className="py-24 text-center" style={{ color: 'var(--color-brand-muted)' }}>Cargando sorteo...</p> : !sorteo ? (
          <section className="py-24 text-center">
            <h1 className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Sorteo no disponible</h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-brand-muted)' }}>{supabase ? 'El enlace no existe o el sorteo está en borrador.' : 'Este sitio aún no tiene configurada la conexión con Supabase en Vercel.'}</p>
          </section>
        ) : success ? (
          <section className="mx-auto max-w-xl py-24 text-center">
            <p className="mb-3 text-sm uppercase tracking-wide" style={{ color: 'var(--color-brand-gold)' }}>Participación registrada</p>
            <h1 className="font-display text-4xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>¡Gracias, {persona.nombres}!</h1>
            <p className="mt-4" style={{ color: 'var(--color-brand-muted)' }}>Tus respuestas se guardaron correctamente para {sorteo.nombre}.</p>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section>
              {sorteo.imagen_url && <img src={sorteo.imagen_url} alt={sorteo.nombre} className="mb-6 aspect-[16/10] w-full rounded-2xl border object-cover" style={{ borderColor: 'var(--color-brand-border)' }} />}
              <h1 className="font-display text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{sorteo.nombre}</h1>
              <p className="mt-4 leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{sorteo.descripcion}</p>
              {(sorteo.premio_nombre || sorteo.premio_descripcion) && (
                <div className="mt-7 border-y py-5" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-brand-gold)' }}>Premio</p>
                  {sorteo.premio_nombre && <h2 className="mt-2 text-xl font-semibold">{sorteo.premio_nombre}</h2>}
                  {sorteo.premio_descripcion && <p className="mt-1 whitespace-pre-line text-sm" style={{ color: 'var(--color-brand-muted)' }}>{sorteo.premio_descripcion}</p>}
                </div>
              )}
              <p className="mt-5 text-xs" style={{ color: 'var(--color-brand-muted)' }}>Vigencia: {sorteo.fecha_inicio} al {sorteo.fecha_fin}</p>
            </section>

            <section className="rounded-2xl border p-5 sm:p-7" style={{ background: 'var(--color-brand-card)', borderColor: 'var(--color-brand-border)' }}>
              {closed ? <div className="py-8 text-center"><h2 className="font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-gold)' }}>Sorteo finalizado</h2><p className="mt-2 text-sm" style={{ color: 'var(--color-brand-muted)' }}>Ya no se aceptan nuevas participaciones.</p></div> : notStarted ? <div className="py-8 text-center"><h2 className="font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Próximamente</h2><p className="mt-2 text-sm" style={{ color: 'var(--color-brand-muted)' }}>La participación estará disponible desde {sorteo.fecha_inicio}.</p></div> : (
                <form onSubmit={submit} className="space-y-5">
                  <div><h2 className="font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Participa ahora</h2><p className="mt-1 text-sm" style={{ color: 'var(--color-brand-muted)' }}>Completa tus datos y responde la encuesta.</p></div>
                  <h3 className="border-b pb-2 text-sm font-semibold" style={{ borderColor: 'var(--color-brand-border)' }}>Datos personales</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PublicField label="Nombres" required value={persona.nombres} onChange={(value) => setPersona((p) => ({ ...p, nombres: value }))} />
                    <PublicField label="Apellidos" required value={persona.apellidos} onChange={(value) => setPersona((p) => ({ ...p, apellidos: value }))} />
                    <PublicField label="Teléfono (9 dígitos)" required value={persona.telefono} maxLength={9} inputMode="numeric" onChange={(value) => setPersona((p) => ({ ...p, telefono: value.replace(/\D/g, '') }))} />
                    <CitySelect value={persona.ciudad} onChange={(value) => setPersona((p) => ({
                      ...p,
                      ciudad: value,
                      departamento: value === 'Ayacucho' ? 'Ayacucho' : '',
                      provincia: value === 'Ayacucho' ? 'Huamanga' : '',
                      distrito: value === 'Ayacucho' ? 'Ayacucho' : '',
                    }))} />
                    {persona.ciudad === 'Ayacucho' && <>
                      <LocationValue label="Departamento" value={persona.departamento} />
                      <LocationValue label="Provincia" value={persona.provincia} />
                      <LocationSelect label="Distrito" value={persona.distrito} options={HUAMANGA_DISTRICTS} onChange={(value) => setPersona((p) => ({ ...p, distrito: value }))} />
                    </>}
                    {taxiCompanyQuestion && <TaxiCompanyField question={taxiCompanyQuestion} value={respuestas[taxiCompanyQuestion.id]} onChange={(value) => setRespuestas((previous) => ({ ...previous, [taxiCompanyQuestion.id]: value }))} />}
                    <PublicField label="Fecha de cumpleaños" required type="date" value={persona.fechaNacimiento} onChange={(value) => setPersona((p) => ({ ...p, fechaNacimiento: value }))} />
                  </div>
                  {additionalQuestions.length > 0 && <section className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--color-brand-border)' }}><h3 className="text-sm font-semibold">Preguntas adicionales</h3>{additionalQuestions.map((question) => <QuestionField key={question.id} question={question} value={respuestas[question.id]} onChange={(value) => setRespuestas((prev) => ({ ...prev, [question.id]: value }))} />)}</section>}
                  <label className="flex items-start gap-3 text-xs leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
                    <input type="checkbox" required checked={persona.acepta} onChange={(event) => setPersona((p) => ({ ...p, acepta: event.target.checked }))} className="mt-0.5 accent-yellow-500" />
                    <span>Acepto los <button type="button" className="underline" style={{ color: 'var(--color-brand-gold)' }} onClick={() => onOpenLegal('terms')}>términos y condiciones</button> y la <button type="button" className="underline" style={{ color: 'var(--color-brand-gold)' }} onClick={() => onOpenLegal('privacy')}>política de privacidad</button>.</span>
                  </label>
                  {error && <p role="alert" className="text-sm" style={{ color: 'var(--color-brand-error)' }}>{error}</p>}
                  <button disabled={saving} className="w-full rounded-xl py-3.5 font-bold transition hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-button-text)' }}>{saving ? 'Registrando...' : 'Enviar participación'}</button>
                </form>
              )}
            </section>
          </div>
        )}
      </main>
      <footer className="border-t px-4 py-5 text-center text-xs" style={{ borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-muted)' }}>© {new Date().getFullYear()} Las Flores</footer>
    </div>
  );
}

function PublicField({ label, value, onChange, required = false, type = 'text', maxLength, inputMode }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}{required ? ' *' : ''}<input type={type} value={value} required={required} maxLength={maxLength} inputMode={inputMode} max={type === 'date' ? todayDate() : undefined} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>;
}

function CitySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>Ciudad *<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }}>
    <option value="" disabled>Selecciona tu ciudad</option>
    {PERU_MAIN_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
  </select></label>;
}

function LocationValue({ label, value }: { label: string; value: string }) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}<input readOnly value={value} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }} /></label>;
}

function LocationSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-brand-muted)' }}>{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-brand-bg)', borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-cream)' }}>
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select></label>;
}

function TaxiCompanyField({ question, value, onChange }: {
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

function QuestionField({ question, value, onChange }: {
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