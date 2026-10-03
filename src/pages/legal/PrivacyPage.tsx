import BrandWordmark from '../../components/BrandWordmark';

type PrivacyPageProps = {
  onBack: () => void;
};

export default function PrivacyPage({ onBack }: PrivacyPageProps) {
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
            Política de privacidad
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-cream)' }}>
            Protección de datos personales
          </h1>

          <div className="space-y-5 text-sm leading-7" style={{ color: 'var(--color-brand-muted)' }}>
            <p>Restaurante Las Flores tratará los datos proporcionados mediante el formulario para participar en cualquiera de los sorteos o campañas promocionales activos y para gestionar la selección de ganadores, la comunicación con los participantes y la entrega de premios.</p>
            <p>Los datos solicitados serán únicamente los necesarios para identificar y contactar al participante, tales como nombres y apellidos, número de celular, fecha de nacimiento, ciudad y otros datos requeridos por la mecánica de cada sorteo. El participante deberá proporcionar información verdadera y actualizada.</p>
            <p>Los datos serán utilizados exclusivamente para los fines relacionados con cada campaña activa, su validación, la administración del evento y el cumplimiento de obligaciones legales, y no se usarán para promociones o comunicaciones comerciales sin la autorización previa del participante.</p>
            <p>Restaurante Las Flores podrá comunicarse con los ganadores mediante llamada telefónica, WhatsApp y/o sus canales oficiales para confirmar la participación, verificar identidad o coordinar la entrega del premio.</p>
            <p>La información será tratada con medidas razonables de seguridad y solo durante el tiempo necesario para la gestión del sorteo, la atención de consultas, la resolución de incidencias y el cumplimiento de obligaciones legales.</p>
            <p>El participante podrá solicitar información sobre el tratamiento de sus datos, así como ejercer sus derechos de acceso, rectificación, oposición, cancelación y otros previstos por la normativa aplicable, contactando a Restaurante Las Flores a través de los canales oficiales.</p>
            <p>La participación en cualquiera de los sorteos activos implica la aceptación de esta política de privacidad y del tratamiento de la información necesaria para la gestión del evento. Cualquier autorización de uso de imagen para fotografías o material audiovisual durante la entrega o disfrute del premio será solicitada por separado antes de utilizar imágenes identificables con fines promocionales o de difusión.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
