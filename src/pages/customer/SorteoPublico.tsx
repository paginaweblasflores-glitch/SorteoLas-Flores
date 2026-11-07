import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { brandOf, raffleLogo, type BrandId } from '../../assets/raffleLogos';
import BrandWordmark from '../../components/BrandWordmark';
import EventPoster from '../../templates/EventPoster';
import { posterTemplate, templateIdFor } from '../../templates/registry';
import {
  HUAMANGA_DISTRICTS, LocationSelect, LocationValue, PublicField, QuestionField, TaxiCompanyField, todayDate,
  type Pregunta,
} from './publicFields';


type Sorteo = {
  id: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'pendiente' | 'finalizado';
  imagen_url: string | null;
  fondo_url: string | null;
  tipo?: string | null;
  premio_nombre: string | null;
};

type DatosParticipante = {
  nombres: string;
  apellidos: string;
  telefono: string;
  departamento: string;
  provincia: string;
  distrito: string;
  fechaNacimiento: string;
  acepta: boolean;
};

const EMPTY_PERSON: DatosParticipante = {
  nombres: '', apellidos: '', telefono: '', departamento: 'Ayacucho',
  provincia: 'Huamanga', distrito: 'Ayacucho', fechaNacimiento: '', acepta: false,
};



function statusFor(sorteo: Sorteo) {
  if (sorteo.estado === 'finalizado' || todayDate() > sorteo.fecha_fin) return 'finalizado';
  if (todayDate() < sorteo.fecha_inicio) return 'pendiente';
  return sorteo.estado;
}

function isMissingBackgroundColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204') && error.message?.includes('fondo_url'));
}

export default function SorteoPublico({ slug, onOpenLegal }: {
  slug: string | null;
  onOpenLegal: (type: 'terms' | 'privacy', brand: BrandId | null) => void;
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
        .select('id,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,imagen_url,fondo_url,premio_nombre');
      let { data, error: raffleError } = slug
        ? await raffleQuery.eq('slug', slug).in('estado', ['activo', 'finalizado']).maybeSingle()
        : await raffleQuery.eq('estado', 'activo').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (isMissingBackgroundColumn(raffleError)) {
        const fallbackQuery = supabase.from('sorteos')
          .select('id,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,imagen_url,premio_nombre');
        const fallback = slug
          ? await fallbackQuery.eq('slug', slug).in('estado', ['activo', 'finalizado']).maybeSingle()
          : await fallbackQuery.eq('estado', 'activo').order('created_at', { ascending: false }).limit(1).maybeSingle();
        data = fallback.data ? { ...fallback.data, fondo_url: null } : null;
        raffleError = fallback.error;
      }
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
      if (data.fondo_url && !posterTemplate(templateIdFor(data))) await preloadImage(data.fondo_url, 2500);
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
  const template = sorteo ? posterTemplate(templateIdFor(sorteo)) : null;
  const taxiCompanyQuestion = preguntas.find((question) => question.tipo === 'seleccion_unica' && question.opciones.includes('Independiente'));
  const additionalQuestions = preguntas.filter((question) => question.id !== taxiCompanyQuestion?.id);
  const brand = brandOf(sorteo?.imagen_url);
  const footerLogo = raffleLogo(sorteo?.imagen_url, Boolean(sorteo?.fondo_url));

  useEffect(() => {
    if (sorteo) document.title = brand ? `${sorteo.nombre} · ${brand.label}` : sorteo.nombre;
  }, [sorteo, brand]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#18110d' }} role="status" aria-live="polite">
        <span className="sr-only">Cargando sorteo</span>
        <span aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-white/15 border-t-white/70 animate-spin" />
      </div>
    );
  }

  if (sorteo && template) {
    const PosterPage = template.Page ?? EventPoster;
    return (
      <PosterPage
        template={template}
        sorteo={sorteo}
        brand={brand}
        closed={closed}
        notStarted={notStarted}
        success={success}
        saving={saving}
        error={error}
        persona={persona}
        setPersona={setPersona}
        respuestas={respuestas}
        setRespuestas={setRespuestas}
        taxiCompanyQuestion={taxiCompanyQuestion}
        additionalQuestions={additionalQuestions}
        onSubmit={submit}
        onOpenLegal={onOpenLegal}
      />
    );
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{
      backgroundColor: 'var(--color-brand-bg)',
      backgroundImage: sorteo?.fondo_url
        ? `linear-gradient(rgba(24, 17, 13, 0.78), rgba(24, 17, 13, 0.78)), url("${sorteo.fondo_url}")`
        : undefined,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      color: 'var(--color-brand-cream)',
      fontFamily: 'var(--font-body)',
    }}>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {!sorteo ? (
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
            <section style={{ color: '#fff' }}>
              <h1 className="font-display text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: '#fff' }}>{sorteo.nombre}</h1>
              <p className="mt-4 leading-relaxed" style={{ color: '#fff' }}>{sorteo.descripcion}</p>
              {sorteo.premio_nombre && (
                <div className="mt-7 border-y py-5" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <p className="text-xs uppercase tracking-wide" style={{ color: '#fff' }}>Premio</p>
                  <h2 className="mt-2 whitespace-pre-line text-xl font-semibold" style={{ color: '#fff' }}>{sorteo.premio_nombre}</h2>
                </div>
              )}
              <p className="mt-5 text-xs" style={{ color: '#fff' }}>Vigencia: {sorteo.fecha_inicio} al {sorteo.fecha_fin}</p>
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
                    <LocationValue label="Departamento" value={persona.departamento} />
                    <LocationValue label="Provincia" value={persona.provincia} />
                    <LocationSelect label="Distrito" value={persona.distrito} options={HUAMANGA_DISTRICTS} onChange={(value) => setPersona((p) => ({ ...p, distrito: value }))} />
                    {taxiCompanyQuestion && <TaxiCompanyField question={taxiCompanyQuestion} value={respuestas[taxiCompanyQuestion.id]} onChange={(value) => setRespuestas((previous) => ({ ...previous, [taxiCompanyQuestion.id]: value }))} />}
                    <PublicField label="Fecha de cumpleaños" required type="date" value={persona.fechaNacimiento} onChange={(value) => setPersona((p) => ({ ...p, fechaNacimiento: value }))} />
                  </div>
                  {additionalQuestions.length > 0 && <section className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--color-brand-border)' }}><h3 className="text-sm font-semibold">Preguntas adicionales</h3>{additionalQuestions.map((question) => <QuestionField key={question.id} question={question} value={respuestas[question.id]} onChange={(value) => setRespuestas((prev) => ({ ...prev, [question.id]: value }))} />)}</section>}
                  <label className="flex items-start gap-3 text-xs leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
                    <input type="checkbox" required checked={persona.acepta} onChange={(event) => setPersona((p) => ({ ...p, acepta: event.target.checked }))} className="mt-0.5 accent-yellow-500" />
                    <span>Acepto los <button type="button" className="underline" style={{ color: 'var(--color-brand-gold)' }} onClick={() => onOpenLegal('terms', brand?.id ?? null)}>términos y condiciones</button> y la <button type="button" className="underline" style={{ color: 'var(--color-brand-gold)' }} onClick={() => onOpenLegal('privacy', brand?.id ?? null)}>política de privacidad</button>.</span>
                  </label>
                  {error && <p role="alert" className="text-sm" style={{ color: 'var(--color-brand-error)' }}>{error}</p>}
                  <button disabled={saving} className="w-full rounded-xl py-3.5 font-bold transition hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-button-text)' }}>{saving ? 'Registrando...' : 'Enviar participación'}</button>
                </form>
              )}
            </section>
          </div>
        )}
      </main>
      {sorteo && footerLogo && (
        <footer className="border-t px-4 py-6" style={{ borderColor: sorteo.fondo_url ? 'rgba(255,255,255,0.18)' : 'var(--color-brand-border)' }}>
          <div className="flex justify-center">
            <BrandWordmark src={footerLogo} alt={brand ? brand.label : `Logotipo de ${sorteo.nombre}`} />
          </div>
        </footer>
      )}
    </div>
  );
}

function preloadImage(url: string, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    window.setTimeout(done, timeoutMs);
    img.src = url;
  });
}
