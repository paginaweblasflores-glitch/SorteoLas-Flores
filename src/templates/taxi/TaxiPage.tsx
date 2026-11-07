/*
  THESIS: el sorteo como un viaje en taxi: de la portada (punto de partida) a los premios
  (paradas en la ruta) y al formulario (el destino). Nada de afiche centrado con guirnaldas.
  OWN-WORLD: ámbar taxi, café oscuro, gris claro y blanco; secciones con cortes en diagonal,
  títulos en letra de brocha, una ruta punteada con pines de mapa.
  FIRST VIEWPORT (móvil): foto del sorteo teñida de ámbar,
  título en brocha, vigencia y botón ámbar "Quiero participar".
*/
import { useMemo } from 'react';
import {
  HUAMANGA_DISTRICTS, LocationSelect, LocationValue, PublicField, QuestionField, TaxiCompanyField,
} from '../../pages/customer/publicFields';
import { displayTitle, longDate, parsePrizes, type PosterPageProps } from '../EventPoster';

function Pin({ label, tone = 'amber' }: { label: string; tone?: 'amber' | 'brown' }) {
  const fill = tone === 'amber' ? '#f6ae19' : '#3a2409';
  const text = tone === 'amber' ? '#3a2409' : '#f6ae19';
  return (
    <svg viewBox="0 0 40 52" className="h-[52px] w-10 shrink-0 drop-shadow-[0_3px_4px_rgba(58,36,9,0.25)]" aria-hidden="true" focusable="false">
      <path d="M20 51C20 51 3 31.5 3 19.5a17 17 0 0 1 34 0C37 31.5 20 51 20 51Z" fill={fill} stroke="#3a2409" strokeWidth="2.5" />
      <circle cx="20" cy="19.5" r="11" fill="#fff" />
      <text x="20" y="25" textAnchor="middle" fontFamily="Manrope Variable, sans-serif" fontWeight="800" fontSize="15" fill={text}>{label}</text>
    </svg>
  );
}

export default function TaxiPage(props: PosterPageProps) {
  const { template, sorteo, brand, closed, notStarted, success, saving, error, persona, setPersona, respuestas, setRespuestas, taxiCompanyQuestion, additionalQuestions, onSubmit, onOpenLegal } = props;
  const prizeInfo = useMemo(() => parsePrizes(sorteo.premio_nombre), [sorteo.premio_nombre]);
  const title = displayTitle(sorteo.nombre);
  const canParticipate = !closed && !notStarted && !success;
  const heroImage = template.heroImage ?? sorteo.fondo_url ?? null;

  return (
    <div className="tx">
      {/* Portada: punto de partida */}
      <section className="tx-hero tx-cut-bottom relative" style={heroImage ? { backgroundImage: `url("${heroImage}")` } : undefined}>
        <div className="relative z-10 mx-auto max-w-2xl px-6 pb-24 pt-14 text-center sm:pb-32 sm:pt-20">
          <h1 className="tx-script tx-rise text-[3.1rem] leading-[1.02] text-white sm:text-7xl" style={{ textWrap: 'balance' }}>{title}</h1>
          {sorteo.descripcion && <p className="tx-rise mx-auto mt-5 max-w-[30rem] text-[16px] leading-relaxed text-white/90" style={{ animationDelay: '90ms' }}>{sorteo.descripcion}</p>}
          <p className="tx-rise mt-6 inline-flex items-center gap-2 rounded-full border border-white/70 px-4 py-1.5 text-[14px] font-semibold text-white" style={{ animationDelay: '150ms' }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            Del {longDate(sorteo.fecha_inicio)} al {longDate(sorteo.fecha_fin)}
          </p>
          {canParticipate && (
            <div className="tx-rise mt-8" style={{ animationDelay: '210ms' }}>
              <a href="#participar" className="tx-pill tx-pill-amber h-[52px] w-full max-w-[17rem] text-[16px]">Quiero participar</a>
            </div>
          )}
        </div>
      </section>

      {/* Premios: paradas de la ruta */}
      {sorteo.premio_nombre && (
        <section aria-labelledby="tx-premios" className="bg-white px-6 pb-16 pt-6 sm:pt-10">
          <div className="mx-auto max-w-xl">
            <h2 id="tx-premios" className="tx-script text-center text-[2.6rem] text-[#3a2409]">Premios</h2>
            {prizeInfo ? (
              <ol className="tx-route mt-8">
                {prizeInfo.prizes.map((prize, index) => (
                  <li key={index} className="relative flex gap-4 pb-8 last:pb-0">
                    <Pin label={String(index + 1)} tone={index === 0 ? 'amber' : 'brown'} />
                    <div className="min-w-0 pt-1.5">
                      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#b47805]">{prize.place}</p>
                      <p className="mt-0.5 text-[1.2rem] font-bold leading-snug text-[#3a2409]">{prize.name}</p>
                      {prize.details.map((detail, i) => <p key={i} className="mt-1 text-[15px] leading-relaxed text-[#5b4a33]">{detail}</p>)}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 whitespace-pre-line text-center text-[16px] leading-relaxed text-[#3a2409]">{sorteo.premio_nombre}</p>
            )}
            {prizeInfo?.note && <p className="mt-8 text-center text-[13px] italic text-[#6b5a43]">{prizeInfo.note}</p>}
          </div>
        </section>
      )}

      {/* Participación: el destino */}
      <section id="participar" aria-labelledby="tx-participa" className="tx-cut-top scroll-mt-4 bg-[#ececec] px-5 pb-28 pt-20 sm:pb-36 sm:pt-24">
        <div className="mx-auto max-w-xl">
          {success ? (
            <div className="text-center" role="status">
              <h2 id="tx-participa" className="tx-script text-[2.5rem] text-[#3a2409]">¡Listo, {persona.nombres.split(' ')[0]}!</h2>
              <p className="mx-auto mt-3 max-w-[26rem] text-[16px] leading-relaxed text-[#4a3d2c]">Tu participación en «{title}» quedó registrada. {template.farewell}</p>
            </div>
          ) : closed || notStarted ? (
            <div className="text-center">
              <h2 id="tx-participa" className="tx-script text-[2.4rem] text-[#3a2409]">{closed ? 'Sorteo finalizado' : 'Muy pronto'}</h2>
              <p className="mt-3 text-[16px] text-[#4a3d2c]">
                {closed ? 'Ya no se aceptan nuevas participaciones. Gracias por acompañarnos.' : `Podrás participar desde el ${longDate(sorteo.fecha_inicio, true)}.`}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="tx-form">
              <div className="text-center">
                <h2 id="tx-participa" className="tx-script text-[2.6rem] text-[#3a2409]">Participa</h2>
                <p className="mt-1 text-[15px] text-[#4a3d2c]">Completa tus datos para entrar al sorteo.</p>
              </div>

              <fieldset className="mt-8">
                <legend className="tx-legend">Tus datos</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PublicField label="Nombres" required value={persona.nombres} onChange={(value) => setPersona((p) => ({ ...p, nombres: value }))} />
                  <PublicField label="Apellidos" required value={persona.apellidos} onChange={(value) => setPersona((p) => ({ ...p, apellidos: value }))} />
                  <PublicField label="Celular (9 dígitos)" required type="tel" value={persona.telefono} maxLength={9} inputMode="numeric" onChange={(value) => setPersona((p) => ({ ...p, telefono: value.replace(/\D/g, '') }))} />
                  <PublicField label="Fecha de cumpleaños" required type="date" value={persona.fechaNacimiento} onChange={(value) => setPersona((p) => ({ ...p, fechaNacimiento: value }))} />
                </div>
              </fieldset>

              <fieldset className="mt-8">
                <legend className="tx-legend">Dónde vives</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LocationSelect label="Distrito" value={persona.distrito} options={HUAMANGA_DISTRICTS} onChange={(value) => setPersona((p) => ({ ...p, distrito: value }))} />
                  <LocationValue label="Provincia" value={persona.provincia} />
                  <LocationValue label="Departamento" value={persona.departamento} />
                </div>
              </fieldset>

              {taxiCompanyQuestion && (
                <fieldset className="mt-8">
                  <legend className="tx-legend">Tu taxi</legend>
                  <TaxiCompanyField question={taxiCompanyQuestion} value={respuestas[taxiCompanyQuestion.id]} onChange={(value) => setRespuestas((previous) => ({ ...previous, [taxiCompanyQuestion.id]: value }))} />
                </fieldset>
              )}

              {additionalQuestions.length > 0 && (
                <fieldset className="mt-8 space-y-5">
                  <legend className="tx-legend">Cuéntanos un poco más</legend>
                  {additionalQuestions.map((question) => <QuestionField key={question.id} question={question} value={respuestas[question.id]} onChange={(value) => setRespuestas((prev) => ({ ...prev, [question.id]: value }))} />)}
                </fieldset>
              )}

              <label className="mt-8 flex items-start gap-3 text-[14px] leading-relaxed text-[#4a3d2c]">
                <input type="checkbox" required checked={persona.acepta} onChange={(event) => setPersona((p) => ({ ...p, acepta: event.target.checked }))} className="mt-1 h-[18px] w-[18px] shrink-0" />
                <span>Acepto los <button type="button" className="tx-link" onClick={() => onOpenLegal('terms', brand?.id ?? null)}>términos y condiciones</button> y la <button type="button" className="tx-link" onClick={() => onOpenLegal('privacy', brand?.id ?? null)}>política de privacidad</button>.</span>
              </label>

              {error && <p role="alert" className="mt-4 rounded-lg bg-[#fbeaea] px-3.5 py-3 text-[14px] text-[#9b1c1c]">{error}</p>}

              <div className="mt-7 text-center">
                <button disabled={saving} className="tx-pill tx-pill-brown h-[54px] w-full max-w-[20rem] text-[16px] disabled:opacity-60">
                  {saving ? 'Registrando…' : 'Enviar mi participación'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Cierre */}
      <footer className="tx-cut-top bg-[#3a2409] px-6 pb-10 pt-20 text-center">
        <p className="tx-script text-[2.3rem] leading-tight text-white" style={{ textWrap: 'balance' }}>{template.closing}</p>
        {brand && <img src={brand.logo} alt={brand.label} className="mx-auto mt-6 h-12 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
        <p className="mt-6 text-[13px] text-white/60">Vigencia: del {longDate(sorteo.fecha_inicio, true)} al {longDate(sorteo.fecha_fin, true)}</p>
      </footer>
    </div>
  );
}
