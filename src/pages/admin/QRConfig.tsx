import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RESTAURANT } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

type BusinessLocation = {
  name: string;
  mapsUrl: string;
};

const LOCATIONS_CONFIG_ID = 1;

const DEFAULT_LOCATIONS: BusinessLocation[] = [
  {
    name: RESTAURANT.name,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${RESTAURANT.name}, ${RESTAURANT.address}`)}`,
  },
  { name: '', mapsUrl: '' },
];

function isBusinessLocations(value: unknown): value is BusinessLocation[] {
  return Array.isArray(value) && value.length === 2 && value.every((location: unknown) =>
    typeof location === 'object' &&
    location !== null &&
    'name' in location &&
    typeof location.name === 'string' &&
    'mapsUrl' in location &&
    typeof location.mapsUrl === 'string'
  );
}

function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      url.hostname === 'goo.gl' ||
      url.hostname.endsWith('.google.com') ||
      url.hostname === 'google.com' ||
      url.hostname === 'maps.app.goo.gl'
    );
  } catch {
    return false;
  }
}

function LocationQrCard({
  location,
  index,
  onChange,
}: {
  location: BusinessLocation;
  index: number;
  onChange: (field: keyof BusinessLocation, value: string) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!location.mapsUrl.trim()) {
      setQrDataUrl('');
      setError('');
      return () => { cancelled = true; };
    }

    if (!isGoogleMapsUrl(location.mapsUrl.trim())) {
      setQrDataUrl('');
      setError('Ingresa un enlace HTTPS válido de Google Maps.');
      return () => { cancelled = true; };
    }

    setError('');
    QRCode.toDataURL(location.mapsUrl.trim(), { width: 280, margin: 2, errorCorrectionLevel: 'H' })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch((generationError: unknown) => {
        if (cancelled) return;
        console.error('No se pudo generar el código QR.', generationError);
        setQrDataUrl('');
        setError('No se pudo generar el QR. Revisa el enlace e inténtalo de nuevo.');
      });

    return () => { cancelled = true; };
  }, [location.mapsUrl]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-negocio-${index + 1}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  return (
    <section className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
      <div>
        <h2 className="font-display text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>
          Negocio {index + 1}
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
          Este QR abrirá la ubicación de este negocio en Google Maps.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`business-name-${index}`} className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            Nombre del negocio
          </label>
          <input
            id={`business-name-${index}`}
            value={location.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder={`Nombre del negocio ${index + 1}`}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)' }}
          />
        </div>
        <div>
          <label htmlFor={`maps-url-${index}`} className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
            Enlace compartido de Google Maps
          </label>
          <input
            id={`maps-url-${index}`}
            type="url"
            value={location.mapsUrl}
            onChange={(event) => onChange('mapsUrl', event.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--color-admin-bg)', border: `1px solid ${error ? 'var(--color-brand-error)' : 'var(--color-admin-border)'}`, color: 'var(--color-admin-text)' }}
          />
          {error && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--color-brand-error)' }}>{error}</p>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl p-5" style={{ background: 'var(--color-admin-bg)' }}>
        {qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt={`Código QR de ${location.name || `negocio ${index + 1}`}`} className="h-56 w-56 rounded-lg bg-white p-2" />
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
              style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
            >
              Descargar QR {index + 1} (PNG)
            </button>
          </>
        ) : (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--color-admin-muted)' }}>
            Ingresa un enlace de Google Maps para generar el QR.
          </p>
        )}
      </div>
    </section>
  );
}

export default function AdminQR() {
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      if (!supabase) {
        setError('Supabase no está configurado. No se pueden sincronizar las ubicaciones entre dispositivos.');
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('configuracion_codigos_qr')
        .select('negocios')
        .eq('id', LOCATIONS_CONFIG_ID)
        .maybeSingle();

      if (cancelled) return;
      if (loadError) {
        console.error('No se pudieron cargar las ubicaciones de los negocios.', loadError);
        setError(`No se pudieron cargar las ubicaciones compartidas. ${loadError.message}`);
      } else if (data?.negocios !== undefined) {
        if (isBusinessLocations(data.negocios)) {
          setLocations(data.negocios);
        } else {
          setError('La configuración compartida de los QR no tiene un formato válido.');
        }
      }
      setLoading(false);
    }

    void loadLocations();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (!supabase) {
      setError('Supabase no está configurado. No se pueden sincronizar las ubicaciones entre dispositivos.');
      return;
    }
    if (locations.some((location) => !location.name.trim() || !isGoogleMapsUrl(location.mapsUrl.trim()))) {
      setError('Completa el nombre y pega un enlace HTTPS válido de Google Maps para los dos negocios.');
      setSaved(false);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    const savedLocations = locations.map((location) => ({
      name: location.name.trim(),
      mapsUrl: location.mapsUrl.trim(),
    }));
    const { error: saveError } = await supabase
      .from('configuracion_codigos_qr')
      .upsert({ id: LOCATIONS_CONFIG_ID, negocios: savedLocations }, { onConflict: 'id' });
    setSaving(false);

    if (saveError) {
      console.error('No se pudieron guardar las ubicaciones de los negocios.', saveError);
      setError(`No se pudieron guardar las ubicaciones compartidas. ${saveError.message}`);
      return;
    }
    setLocations(savedLocations);
    setSaved(true);
  }

  function updateLocation(index: number, field: keyof BusinessLocation, value: string) {
    setLocations((previous) => previous.map((location, locationIndex) =>
      locationIndex === index ? { ...location, [field]: value } : location
    ));
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
        Configura un enlace de Google Maps para cada negocio. Cada código QR es independiente y se puede descargar como imagen PNG. Al guardar, las ubicaciones quedan disponibles en todos tus dispositivos.
      </p>
      {loading && <p role="status" className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Cargando ubicaciones compartidas...</p>}
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--color-brand-error)' }}>{error}</p>}
      {saved && <p role="status" className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Ubicaciones guardadas en Supabase y disponibles desde cualquier dispositivo.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {locations.map((location, index) => (
          <LocationQrCard
            key={index}
            location={location}
            index={index}
            onChange={(field, value) => updateLocation(index, field, value)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={loading || saving || !supabase}
        className="w-full rounded-2xl py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
      >
        {loading ? 'Cargando...' : saving ? 'Guardando...' : saved ? 'Ubicación guardada' : 'Guardar ubicación'}
      </button>

      <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Cómo obtener el enlace</h3>
        <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
          Abre Google Maps, busca el negocio, pulsa «Compartir» y copia el enlace. Pégalo en el campo correspondiente y guarda los cambios para sincronizarlos con todos tus dispositivos.
        </p>
      </div>
    </div>
  );
}
