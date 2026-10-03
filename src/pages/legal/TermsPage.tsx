import BrandWordmark from '../../components/BrandWordmark';

type TermsPageProps = {
  onBack: () => void;
};

export default function TermsPage({ onBack }: TermsPageProps) {
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
            Términos y condiciones
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-cream)' }}>
            Bases de participación
          </h1>

          <div className="space-y-5 text-sm leading-7" style={{ color: 'var(--color-brand-muted)' }}>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>1. Organizador</h2>
              <p>Los sorteos y campañas promocionales publicados por Restaurante Las Flores son organizados por la misma marca y pueden coexistir simultáneamente, cada uno con su propia mecánica, vigencia y requisitos.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>2. Premios y mecánica</h2>
              <p>Cada sorteo tendrá sus propios premios, condiciones de participación, plazo de inscripción, fecha de cierre y forma de selección de ganadores. Las bases específicas de cada actividad serán publicadas en el canal oficial correspondiente y prevalecerán sobre estas condiciones generales.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>3. ¿Cómo participar?</h2>
              <p>Para participar, el usuario deberá completar el formulario habilitado para el sorteo correspondiente, registrar información veraz y actualizada, aceptar estas condiciones generales y cumplir con los requisitos específicos indicados en la convocatoria vigente. La participación es gratuita y no implica la compra de ningún producto o servicio.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>4. Datos del participante</h2>
              <p>Para validar la participación se podrán solicitar únicamente los datos necesarios para identificar, contactar y verificar al participante, como nombres y apellidos, número de celular, fecha de nacimiento y lugar de residencia cuando corresponda. Cada participante deberá proporcionar información verdadera y completa.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>5. Participaciones y elegibilidad</h2>
              <p>Cada persona podrá participar conforme a la mecánica de cada sorteo activo. Los registros duplicados, formularios incompletos, datos falsos o información no verificable podrán ser invalidados. En caso de existir varios sorteos simultáneos, cada sorteo se evaluará de forma independiente y no se acumularán participaciones de un sorteo a otro.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>6. Requisito de edad</h2>
              <p>Podrán participar personas mayores de 18 años, así como quienes cumplan con la edad mínima indicada para el sorteo correspondiente, siempre que se ajusten a la mecánica establecida.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>7. Vigencia</h2>
              <p>Cada sorteo tendrá una fecha de inicio, cierre y anuncio de resultados definida por la organización. Los registros recibidos fuera del plazo establecido no serán considerados, incluso si otros sorteos de la marca se encuentren activos en el mismo periodo.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>8. Selección de ganadores</h2>
              <p>Los ganadores serán seleccionados por la organización según la metodología establecida para cada sorteo, que puede incluir sorteo aleatorio, revisión de participación o evaluación de criterios específicos. La decisión de la organización será definitiva en todos los casos.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>9. Comunicación e identificación</h2>
              <p>Los ganadores serán contactados a través del número telefónico o canal oficial registrado para la participación, conforme lo indique cada sorteo. El ganador deberá acreditar su identidad y confirmar los datos registrados para validar la entrega del premio. Si no pudiera ser contactado dentro de los plazos previstos, la organización podrá seleccionar a un suplente o cerrar la asignación del premio.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>10. Entrega y disfrute del premio</h2>
              <p>Los premios se entregarán de acuerdo con la mecánica, disponibilidad, horarios y condiciones comunicadas para cada sorteo. Los premios no serán transferibles, canjeables por dinero en efectivo ni sustituidos por otros productos o servicios, salvo que la organización lo disponga por escrito.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>11. Protección de datos personales</h2>
              <p>Los datos proporcionados a través del formulario serán utilizados para administrar la participación, validar los registros, seleccionar ganadores y comunicar novedades relacionadas con el sorteo o con campañas posteriores cuando exista la autorización previa del participante.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>12. Autorización de imagen</h2>
              <p>En caso de utilizarlas, las fotografías o grabaciones realizadas durante la entrega o disfrute del premio podrán requerir previa autorización del participante para fines promocionales o de difusión. La organización solo hará uso de estas imágenes cuando corresponda y con consentimiento expreso.</p>
            </section>
            <section>
              <h2 className="font-semibold" style={{ color: 'var(--color-brand-cream)' }}>13. Aceptación</h2>
              <p>La participación en cualquiera de los sorteos activos implica que el participante ha leído, entendido y aceptado estas condiciones generales, así como las bases específicas del sorteo correspondiente. Cualquier situación no contemplada será resuelta por Restaurante Las Flores conforme a sus políticas internas y a la normativa aplicable.</p>
              <p>Restaurante Las Flores<br />Ayacucho - Perú</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
