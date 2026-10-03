import BrandWordmark from '../../components/BrandWordmark';

type LegalPageProps = {
  type: 'terms' | 'privacy';
  onBack: () => void;
};

export default function LegalPage({ type, onBack }: LegalPageProps) {
  const isTerms = type === 'terms';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-brand-bg)', color: 'var(--color-brand-cream)', fontFamily: 'var(--font-body)' }}>
      <header className="border-b px-4 py-4" style={{ borderColor: 'var(--color-brand-border)', background: '#f8f5f2' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-80"
            style={{ background: 'rgba(18,14,12,0.06)', color: '#1d1d1d', border: '1px solid rgba(18,14,12,0.12)' }}
          >
            ← Volver
          </button>
          <div className="text-center">
            <BrandWordmark />
          </div>
          <div style={{ width: 88 }} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div className="rounded-3xl p-6 md:p-8" style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-brand-gold)' }}>
            {isTerms ? 'Términos y condiciones' : 'Política de privacidad'}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-cream)' }}>
            {isTerms ? 'Bases de participación' : 'Protección de datos personales'}
          </h1>

          {isTerms ? (
            <div className="space-y-5 text-sm leading-7" style={{ color: 'var(--color-brand-muted)' }}>
              <p>
                La organización puede publicar y mantener varios sorteos o campañas promocionales activos al mismo tiempo. Cada actividad tendrá su propia mecánica, premios, vigencia y requisitos específicos.
              </p>
              <p>
                La participación es válida únicamente para personas mayores de edad o que cumplan con los requisitos indicados para el sorteo correspondiente, siempre que completen el formulario de inscripción con información veraz y completa.
              </p>
              <p>
                Al participar, el usuario acepta que la información entregada será utilizada exclusivamente para la administración del sorteo, la validación de la participación, la comunicación de resultados y la coordinación de premios o notificaciones relacionadas con la actividad específica.
              </p>
              <p>
                La organización se reserva el derecho de cancelar, modificar, prorrogar o suspender cualquiera de los sorteos activos en caso de fuerza mayor, error técnico, fraude, manipulación de datos o cualquier circunstancia que afecte la seguridad o transparencia del proceso.
              </p>
              <p>
                Los premios y condiciones de entrega pueden variar según cada sorteo. En general, no serán transferibles, canjeables por dinero en efectivo ni negociables, salvo que la organización lo disponga por escrito para una campaña específica.
              </p>
              <p>
                La participación en cualquiera de los sorteos activos se regirá por la normativa aplicable, por la mecánica publicada para ese sorteo y por las decisiones definitivas de la organización, que serán vinculantes para todos los participantes.
              </p>
            </div>
          ) : (
            <div className="space-y-5 text-sm leading-7" style={{ color: 'var(--color-brand-muted)' }}>
              <p>
                La organización recopila y trata datos personales para gestionar la inscripción a cualquiera de los sorteos activos, validar la identidad del participante, comunicar resultados y coordinar la entrega de premios.
              </p>
              <p>
                Los datos recolectados pueden incluir nombres, apellidos, teléfono, correo electrónico, ciudad, fecha de nacimiento y otros datos necesarios para la mecánica del sorteo. Estos se usarán únicamente para los fines descritos y para cumplir obligaciones legales y operativas del evento.
              </p>
              <p>
                La información será almacenada en medios seguros y accesibles únicamente por personal autorizado. No se compartirá con terceros, salvo cuando ello sea necesario para la ejecución del sorteo, el cumplimiento de obligaciones legales o la prestación de servicios de soporte técnico.
              </p>
              <p>
                El participante podrá ejercer sus derechos de acceso, rectificación, cancelación, oposición y otros previstos por la normativa aplicable, contactando a la organización a través del canal oficial indicado durante el proceso de participación.
              </p>
              <p>
                La organización adoptará medidas razonables para proteger la información frente a pérdida, uso indebido, acceso no autorizado o alteración. Sin embargo, ningún sistema digital es completamente invulnerable; por ello, se recomienda mantener los datos de contacto actualizados.
              </p>
              <p>
                La participación en cualquiera de los sorteos activos implica la aceptación de esta política de privacidad y del tratamiento de la información necesaria para la gestión del evento.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
