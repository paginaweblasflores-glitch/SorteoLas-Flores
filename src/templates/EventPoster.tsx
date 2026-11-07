/*
  Página de sorteo tipo afiche, compartida por todas las plantillas de eventos.
  Columna central limpia sobre fondo claro, decoración arriba y abajo,
  título grande en la tipografía del evento y bloques separados por filetes.
*/
import { useMemo } from 'react';
import './poster.css';
import type { Brand, BrandId } from '../assets/raffleLogos';
import {
  HUAMANGA_DISTRICTS, LocationSelect, LocationValue, PublicField, QuestionField, TaxiCompanyField,
  type Pregunta,
} from '../pages/customer/publicFields';
import type { PosterTemplate } from './types';

type Persona = {
  nombres: string; apellidos: string; telefono: string; departamento: string;
  provincia: string; distrito: string; fechaNacimiento: string; acepta: boolean;
};

export type PosterPageProps = {
  template: PosterTemplate;
  sorteo: { nombre: string; descripcion: string; fecha_inicio: string; fecha_fin: string; premio_nombre: string | null; fondo_url?: string | null };
  brand: Brand | null;
  closed: boolean;
  notStarted: boolean;
  success: boolean;
  saving: boolean;
  error: string;
  persona: Persona;
  setPersona: React.Dispatch<React.SetStateAction<Persona>>;
  respuestas: Record<string, string | string[]>;
  setRespuestas: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  taxiCompanyQuestion: Pregunta | undefined;
  additionalQuestions: Pregunta[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpenLegal: (type: 'terms' | 'privacy', brand: BrandId | null) => void;
};

export type Prize = { place: string; name: string; details: string[] };

/** Ordena el texto libre del premio en una lista; si no reconoce el formato devuelve null. */
export function parsePrizes(text: string | null): { prizes: Prize[]; note: string } | null {
  if (!text) return null;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const prizes: Prize[] = [];
  const notes: string[] = [];
  for (const line of lines) {
    const head = line.match(/^(\d+\s*(?:\.?\s*(?:er|ro|do|to|vo|no|°|º))?\.?\s*(?:premio|puesto))\s*[–—:-]?\s*(.*)$/i);
    if (head) prizes.push({ place: head[1].replace(/\s+/g, ' '), name: head[2].replace(/\.$/, ''), details: [] });
    else if (/sujet|condici|coordinaci|disponibilidad/i.test(line) || prizes.length === 0) notes.push(line);
    else prizes[prizes.length - 1].details.push(line.replace(/\.$/, ''));
  }
  return prizes.length ? { prizes, note: notes.join(' ') } : null;
}

/** Títulos escritos en MAYÚSCULAS se muestran en tipo oración, respetando nombres propios. */
export function displayTitle(name: string) {
  if (name !== name.toLocaleUpperCase('es')) return name;
  const lower = name.toLocaleLowerCase('es');
  return (lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1))
    .replace(/las flores/g, 'Las Flores').replace(/umaru/g, 'Umaru').replace(/ayacucho/g, 'Ayacucho');
}

/** Divide el título en dos líneas para el título a dos colores. */
function splitTitle(title: string): [string, string] {
  const words = title.split(/\s+/);
  if (words.length < 2) return [title, ''];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

export function longDate(iso: string, withYear = false) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
}

function ArchedKicker({ text }: { text: string }) {
  return (
    <svg viewBox="0 0 300 64" className="mx-auto block h-auto w-[230px] sm:w-[270px]" role="img" aria-label={text}>
      <path id="ev-arc" d="M18 60 Q150 6 282 60" fill="none" />
      <text className="ev-caps" style={{ fontSize: 23, letterSpacing: '0.12em', fill: 'var(--ev-title)' }}>
        <textPath href="#ev-arc" startOffset="50%" textAnchor="middle">{text.toLocaleUpperCase('es')}</textPath>
      </text>
    </svg>
  );
}

export default function EventPoster(props: PosterPageProps) {
  const { template, sorteo, brand, closed, notStarted, success, saving, error, persona, setPersona, respuestas, setRespuestas, taxiCompanyQuestion, additionalQuestions, onSubmit, onOpenLegal } = props;
  const { Top, Bottom, Ornament, Accents } = template;
  const prizeInfo = useMemo(() => parsePrizes(sorteo.premio_nombre), [sorteo.premio_nombre]);
  const title = displayTitle(sorteo.nombre);
  const [titleA, titleB] = splitTitle(title);
  const canParticipate = !closed && !notStarted && !success;

  return (
    <div className={`ev ${template.className}`}>
      {Top && <Top />}

      <main className="mx-auto max-w-[34rem] px-5 text-center sm:px-6">
        {/* Encabezado tipo afiche */}
        <header className={`relative z-10 ${template.headerClass ?? 'mt-8'}`}>
          {Ornament && <div className="ev-rise"><Ornament /></div>}
          {template.kicker && <div className="ev-rise"><ArchedKicker text={template.kicker} /></div>}
          <h1 className="ev-title ev-rise mt-3" style={{ animationDelay: '90ms' }}>
            <span className="block">{titleA}</span>
            {titleB && <span className="ev-title-2 block">{titleB}</span>}
          </h1>
          {sorteo.descripcion && (
            <p className="ev-rise mx-auto mt-4 max-w-[30rem] text-[16px] leading-relaxed" style={{ color: 'var(--ev-text-soft)', animationDelay: '170ms' }}>{sorteo.descripcion}</p>
          )}
          <div className="ev-rise mt-6" style={{ animationDelay: '230ms' }}>
            <p className="ev-caps text-[1.15rem]">Vigencia</p>
            <p className="mt-1 text-[1.05rem] uppercase tracking-[0.06em]" style={{ color: 'var(--ev-text)' }}>
              Del {longDate(sorteo.fecha_inicio)} al {longDate(sorteo.fecha_fin)}
            </p>
            <hr className="ev-rule mt-4" />
          </div>
          {canParticipate && (
            <a href="#participar" className="ev-rise ev-cta mt-6 inline-flex h-[52px] w-full max-w-[17rem] items-center justify-center rounded-full text-[16px] font-semibold" style={{ animationDelay: '290ms' }}>
              Quiero participar
            </a>
          )}
        </header>

        {/* Premios */}
        {sorteo.premio_nombre && (
          <section aria-labelledby="ev-premios" className="relative mt-11">
            {Accents && <Accents slot="premios" />}
            <h2 id="ev-premios" className="ev-heading text-[2.6rem]">Premios</h2>
            {prizeInfo ? (
              <>
                <ol className="mt-4 space-y-6">
                  {prizeInfo.prizes.map((prize, index) => (
                    <li key={index}>
                      <p className="ev-caps ev-highlight text-[1.15rem]">{prize.place}</p>
                      <p className="mt-1 text-[1.55rem] leading-tight" style={{ fontFamily: 'var(--ev-display)', fontWeight: 600, color: 'var(--ev-text)' }}>{prize.name}</p>
                      {prize.details.map((detail, i) => <p key={i} className="mt-1.5 text-[15px] uppercase leading-relaxed tracking-[0.05em]" style={{ color: 'var(--ev-text-soft)' }}>{detail}</p>)}
                      <hr className="ev-rule mt-5" />
                    </li>
                  ))}
                </ol>
                {prizeInfo.note && <p className="mx-auto mt-6 max-w-[28rem] text-[13px] italic leading-relaxed" style={{ color: 'var(--ev-text-soft)' }}>{prizeInfo.note}</p>}
              </>
            ) : (
              <p className="mt-5 whitespace-pre-line text-[16px] leading-relaxed" style={{ color: 'var(--ev-text)' }}>{sorteo.premio_nombre}</p>
            )}
          </section>
        )}

        {/* Participación */}
        <section id="participar" aria-labelledby="ev-participa" className="relative mt-12 scroll-mt-6 text-left">
          {Accents && <Accents slot="participa" />}
          {success ? (
            <div className="text-center" role="status">
              <h2 id="ev-participa" className="ev-heading text-[2.6rem]">¡Gracias, {persona.nombres.split(' ')[0]}!</h2>
              <p className="mx-auto mt-4 max-w-[26rem] text-[16px] leading-relaxed" style={{ color: 'var(--ev-text-soft)' }}>Tu participación en «{title}» quedó registrada. {template.farewell}</p>
              <hr className="ev-rule mt-7" />
            </div>
          ) : closed || notStarted ? (
            <div className="text-center">
              <h2 id="ev-participa" className="ev-heading text-[2.4rem]">{closed ? 'Sorteo finalizado' : 'Muy pronto'}</h2>
              <p className="mt-3 text-[16px]" style={{ color: 'var(--ev-text-soft)' }}>
                {closed ? 'Ya no se aceptan nuevas participaciones. Gracias por acompañarnos.' : `Podrás participar desde el ${longDate(sorteo.fecha_inicio, true)}.`}
              </p>
              <hr className="ev-rule mt-7" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="ev-form">
              <div className="text-center">
                <h2 id="ev-participa" className="ev-heading text-[2.6rem]">Participa</h2>
                <p className="mt-2 text-[15px]" style={{ color: 'var(--ev-text-soft)' }}>Completa tus datos para entrar al sorteo.</p>
              </div>

              <fieldset className="mt-8">
                <legend className="ev-legend">Tus datos</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PublicField label="Nombres" required value={persona.nombres} onChange={(value) => setPersona((p) => ({ ...p, nombres: value }))} />
                  <PublicField label="Apellidos" required value={persona.apellidos} onChange={(value) => setPersona((p) => ({ ...p, apellidos: value }))} />
                  <PublicField label="Celular (9 dígitos)" required type="tel" value={persona.telefono} maxLength={9} inputMode="numeric" onChange={(value) => setPersona((p) => ({ ...p, telefono: value.replace(/\D/g, '') }))} />
                  <PublicField label="Fecha de cumpleaños" required type="date" value={persona.fechaNacimiento} onChange={(value) => setPersona((p) => ({ ...p, fechaNacimiento: value }))} />
                </div>
              </fieldset>

              <fieldset className="mt-8">
                <legend className="ev-legend">Dónde vives</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LocationSelect label="Distrito" value={persona.distrito} options={HUAMANGA_DISTRICTS} onChange={(value) => setPersona((p) => ({ ...p, distrito: value }))} />
                  <LocationValue label="Provincia" value={persona.provincia} />
                  <LocationValue label="Departamento" value={persona.departamento} />
                  {taxiCompanyQuestion && <TaxiCompanyField question={taxiCompanyQuestion} value={respuestas[taxiCompanyQuestion.id]} onChange={(value) => setRespuestas((previous) => ({ ...previous, [taxiCompanyQuestion.id]: value }))} />}
                </div>
              </fieldset>

              {additionalQuestions.length > 0 && (
                <fieldset className="mt-8 space-y-5">
                  <legend className="ev-legend">Cuéntanos un poco más</legend>
                  {additionalQuestions.map((question) => <QuestionField key={question.id} question={question} value={respuestas[question.id]} onChange={(value) => setRespuestas((prev) => ({ ...prev, [question.id]: value }))} />)}
                </fieldset>
              )}

              <label className="mt-8 flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: 'var(--ev-text-soft)' }}>
                <input type="checkbox" required checked={persona.acepta} onChange={(event) => setPersona((p) => ({ ...p, acepta: event.target.checked }))} className="mt-1 h-[18px] w-[18px] shrink-0" />
                <span>Acepto los <button type="button" className="ev-link" onClick={() => onOpenLegal('terms', brand?.id ?? null)}>términos y condiciones</button> y la <button type="button" className="ev-link" onClick={() => onOpenLegal('privacy', brand?.id ?? null)}>política de privacidad</button>.</span>
              </label>

              {error && <p role="alert" className="mt-4 rounded-lg px-3.5 py-3 text-[14px]" style={{ background: '#fbeaea', color: '#9b1c1c' }}>{error}</p>}

              <button disabled={saving} className="ev-cta mt-6 flex h-[54px] w-full items-center justify-center rounded-full text-[16px] font-semibold disabled:opacity-60">
                {saving ? 'Registrando…' : 'Enviar mi participación'}
              </button>
            </form>
          )}
        </section>

        <footer className="mt-12 pb-2 text-center">
          {template.closing && <p className="ev-script mb-8">{template.closing}</p>}
          {brand && <img src={brand.logo} alt={brand.label} className="mx-auto h-12 w-auto object-contain" />}
        </footer>
      </main>

      {Bottom && <Bottom />}
    </div>
  );
}
