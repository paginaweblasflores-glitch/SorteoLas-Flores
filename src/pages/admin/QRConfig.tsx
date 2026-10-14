import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RESTAURANT } from '../../data/mockData';

type BusinessLocation = {
  name: string;
  mapsUrl: string;
};

const LOCATIONS_STORAGE_KEY = 'business_map_qr_locations';

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

function loadLocations() {
  try {
    const saved = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!saved) return { locations: DEFAULT_LOCATIONS, error: '' };

    const parsed: unknown = JSON.parse(saved);
    if (isBusinessLocations(parsed)) return { locations: parsed, error: '' };

    return { locations: DEFAULT_LOCATIONS, error: 'La configuración guardada no es válida. Ingresa de nuevo los datos.' };
  } catch (error) {
    console.error('No se pudo leer la configuración de los códigos QR.', error);
    return { locations: DEFAULT_LOCATIONS, error: 'No se pudo leer la configuración guardada en este navegador.' };
  }
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
  const [savedState] = useState(loadLocations);
  const [locations, setLocations] = useState(savedState.locations);
  const [storageError, setStorageError] = useState(savedState.error);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
      setStorageError('');
    } catch (error) {
      console.error('No se pudo guardar la configuración de los códigos QR.', error);
      setStorageError('No se pudieron guardar los cambios en este navegador.');
    }
  }, [locations]);

  function updateLocation(index: number, field: keyof BusinessLocation, value: string) {
    setLocations((previous) => previous.map((location, locationIndex) =>
      locationIndex === index ? { ...location, [field]: value } : location
    ));
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
        Configura un enlace de Google Maps para cada negocio. Cada código QR es independiente y se puede descargar como imagen PNG. Los datos se guardan en este navegador.
      </p>
      {storageError && <p role="alert" className="text-xs" style={{ color: 'var(--color-brand-error)' }}>{storageError}</p>}

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

      <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Cómo obtener el enlace</h3>
        <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
          Abre Google Maps, busca el negocio, pulsa «Compartir» y copia el enlace. Pégalo en el campo correspondiente; el QR se actualizará automáticamente.
        </p>
      </div>
    </div>
  );
}
