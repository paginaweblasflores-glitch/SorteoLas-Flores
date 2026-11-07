import { useEffect, useState } from 'react';
import { getBrand } from '../../assets/raffleLogos';
import { DEFAULT_BUSINESSES, hasCoordinates, isGoogleMapsUrl, loadBusinesses, RADIUS_OPTIONS, saveBusinesses, type Business } from '../../lib/businesses';

/*
  Datos de los negocios: Las Flores y Umaru.
  La información se comparte con "QR de Google Maps" (mismo registro en Supabase).
*/

type Field = { key: keyof Business; label: string; type?: string; placeholder?: string; wide?: boolean };

const CONTACT_FIELDS: Field[] = [
  { key: 'name', label: 'Nombre', wide: true },
  { key: 'address', label: 'Dirección', wide: true },
  { key: 'phones', label: 'Teléfonos', type: 'tel', placeholder: '+51 999 999 999 / +51 988 888 888' },
  { key: 'email', label: 'Correo', type: 'email' },
  { key: 'hours', label: 'Horario de atención', wide: true },
];

const LINK_FIELDS: Field[] = [
  { key: 'mapsUrl', label: 'Google Maps', type: 'url', placeholder: 'https://maps.app.goo.gl/…', wide: true },
  { key: 'website', label: 'Sitio web', type: 'url', wide: true },
  { key: 'facebook', label: 'Facebook', type: 'url' },
  { key: 'instagram', label: 'Instagram', type: 'url' },
  { key: 'tiktok', label: 'TikTok', type: 'url', placeholder: 'Opcional' },
];

function Input({ field, value, invalid, onChange }: { field: Field; value: string; invalid?: string; onChange: (value: string) => void }) {
  return (
    <label className={`block text-xs ${field.wide ? 'sm:col-span-2' : ''}`} style={{ color: 'var(--color-admin-muted)' }}>
      {field.label}
      <input
        type={field.type ?? 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-admin-text)]"
        style={{ background: 'var(--color-admin-bg)', borderColor: invalid ? 'var(--color-admin-danger)' : 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}
      />
      {invalid && <span role="alert" className="mt-1 block" style={{ color: 'var(--color-admin-danger)' }}>{invalid}</span>}
    </label>
  );
}

function LocationSection({ business, onChange }: { business: Business; onChange: (field: keyof Business, value: string) => void }) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const ready = hasCoordinates(business);

  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocError('Este navegador no permite obtener la ubicación.'); return; }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange('lat', position.coords.latitude.toFixed(6));
        onChange('lng', position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { setLocating(false); setLocError('No se pudo obtener la ubicación. Revisa el permiso de ubicación del navegador.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  /** Acepta "-13.1601, -74.2233" pegado desde Google Maps en el campo de latitud. */
  function onLatChange(value: string) {
    const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) { onChange('lat', match[1]); onChange('lng', match[2]); return; }
    onChange('lat', value);
  }

  const inputStyle = { background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' };
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-admin-text)' }}>Sorteos solo en el local</legend>
      <p className="mb-3 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
        Punto del local y distancia permitida. Se usa en los sorteos marcados como «Solo pueden participar personas en el local».
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Latitud
          <input inputMode="decimal" value={business.lat} onChange={(event) => onLatChange(event.target.value)} placeholder="-13.16…" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-admin-text)]" style={inputStyle} />
        </label>
        <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Longitud
          <input inputMode="decimal" value={business.lng} onChange={(event) => onChange('lng', event.target.value)} placeholder="-74.22…" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-admin-text)]" style={inputStyle} />
        </label>
        <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Distancia permitida
          <select value={business.radius} onChange={(event) => onChange('radius', event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={inputStyle}>
            {RADIUS_OPTIONS.map((meters) => <option key={meters} value={String(meters)}>{meters} m{meters === (business.brand === 'umaru' ? 500 : 300) ? ' (recomendado)' : ''}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
        </button>
        {ready
          ? <a href={`https://www.google.com/maps?q=${business.lat},${business.lng}`} target="_blank" rel="noreferrer" className="text-xs font-medium underline underline-offset-2" style={{ color: 'var(--color-admin-primary-text)' }}>Comprobar el punto en Google Maps</a>
          : <span className="text-xs" style={{ color: 'var(--color-admin-warning)' }}>Sin coordenadas: los sorteos «solo en el local» de este negocio aceptarán a cualquiera.</span>}
      </div>
      {locError && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--color-admin-danger)' }}>{locError}</p>}
      <p className="mt-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
        Consejo: pulsa «Usar mi ubicación actual» estando dentro del local, o en Google Maps mantén presionado el local, copia las coordenadas y pégalas en «Latitud».
      </p>
    </fieldset>
  );
}


type SaveStatus = { tone: 'ok' | 'error'; text: string } | null;

/** Botones "Guardar / Descartar" dentro de la tarjeta; solo aparecen si hay cambios. */
function CardSave({ dirty, saving, status, label, onSave, onDiscard }: { dirty: boolean; saving: boolean; status: SaveStatus; label: string; onSave: () => void; onDiscard: () => void }) {
  if (!dirty && !status) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {dirty && <>
        <button type="button" onClick={onSave} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--color-admin-primary)', color: '#fffaf8' }}>{saving ? 'Guardando…' : label}</button>
        <button type="button" onClick={onDiscard} disabled={saving} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-60" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Descartar</button>
      </>}
      {status && <p role={status.tone === 'error' ? 'alert' : 'status'} className="text-xs" style={{ color: status.tone === 'error' ? 'var(--color-admin-danger)' : 'var(--color-admin-success)' }}>{status.text}</p>}
    </div>
  );
}

function BusinessCard({ business, onChange, dirty, saving, status, onSave, onDiscard }: {
  business: Business; onChange: (field: keyof Business, value: string) => void;
  dirty: boolean; saving: boolean; status: SaveStatus; onSave: () => void; onDiscard: () => void;
}) {
  const brand = getBrand(business.brand);
  const mapsError = business.mapsUrl.trim() && !isGoogleMapsUrl(business.mapsUrl.trim()) ? 'Debe ser un enlace de Google Maps (https).' : '';
  return (
    <section className="rounded-2xl border" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
      <header className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--color-admin-border)' }}>
        <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-white p-1.5" style={{ border: '1px solid var(--color-admin-border)' }}>
          <img src={brand.logo} alt="" className="max-h-full max-w-full object-contain" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-admin-text)' }}>{business.name || brand.label}</h2>
          <p className="truncate text-xs" style={{ color: 'var(--color-admin-muted)' }}>{business.address}</p>
        </div>
      </header>

      <div className="space-y-6 p-5">
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-admin-text)' }}>Contacto</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map((field) => <Input key={field.key} field={field} value={business[field.key]} onChange={(value) => onChange(field.key, value)} />)}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-admin-text)' }}>Enlaces</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {LINK_FIELDS.map((field) => (
              <Input key={field.key} field={field} value={business[field.key]} invalid={field.key === 'mapsUrl' ? mapsError : undefined} onChange={(value) => onChange(field.key, value)} />
            ))}
          </div>
          {business.mapsUrl && !mapsError && (
            <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2" style={{ color: 'var(--color-admin-primary-text)' }}>
              Ver en Google Maps
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
            </a>
          )}
        </fieldset>

        <LocationSection business={business} onChange={onChange} />
      </div>
      {(dirty || status) && (
        <footer className="border-t px-5 py-4" style={{ borderColor: 'var(--color-admin-border)' }}>
          <CardSave dirty={dirty} saving={saving} status={status} label="Guardar cambios" onSave={onSave} onDiscard={onDiscard} />
        </footer>
      )}
    </section>
  );
}

export default function AdminUbicacion() {
  const [businesses, setBusinesses] = useState<[Business, Business]>(DEFAULT_BUSINESSES);
  const [saved, setSaved] = useState<[Business, Business]>(DEFAULT_BUSINESSES);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<0 | 1 | null>(null);
  const [status, setStatus] = useState<[SaveStatus, SaveStatus]>([null, null]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadBusinesses().then(({ businesses: loaded, error }) => {
      if (cancelled) return;
      setBusinesses(loaded);
      setSaved(loaded);
      setLoadError(error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function setCardStatus(index: 0 | 1, value: SaveStatus) {
    setStatus((current) => (index === 0 ? [value, current[1]] : [current[0], value]));
  }

  function update(index: 0 | 1, field: keyof Business, value: string) {
    setBusinesses((current) => {
      const next: [Business, Business] = [{ ...current[0] }, { ...current[1] }];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setCardStatus(index, null);
  }

  function discard(index: 0 | 1) {
    setBusinesses((current) => {
      const next: [Business, Business] = [{ ...current[0] }, { ...current[1] }];
      next[index] = { ...saved[index] };
      return next;
    });
    setCardStatus(index, null);
  }

  async function saveCard(index: 0 | 1) {
    const business = businesses[index];
    if (!business.name.trim() || !business.address.trim()) { setCardStatus(index, { tone: 'error', text: 'El nombre y la dirección son obligatorios.' }); return; }
    if ((business.lat.trim() || business.lng.trim()) && !hasCoordinates(business)) { setCardStatus(index, { tone: 'error', text: 'Revisa las coordenadas: deben ser números (por ejemplo -13.16 y -74.22).' }); return; }
    if (business.mapsUrl.trim() && !isGoogleMapsUrl(business.mapsUrl.trim())) { setCardStatus(index, { tone: 'error', text: 'El enlace de Google Maps no es válido.' }); return; }
    // Solo se guardan los cambios de esta tarjeta; el otro negocio conserva lo guardado.
    const toSave: [Business, Business] = [{ ...saved[0] }, { ...saved[1] }];
    toSave[index] = { ...business };
    setSavingIndex(index);
    const error = await saveBusinesses(toSave);
    setSavingIndex(null);
    setCardStatus(index, error ? { tone: 'error', text: error } : { tone: 'ok', text: 'Cambios guardados.' });
    if (!error) setSaved(toSave);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="max-w-2xl text-sm" style={{ color: 'var(--color-admin-muted)' }}>
        Información de contacto de cada negocio. El enlace de Google Maps también es el que usan los códigos QR.
      </p>
      {loading && <p role="status" className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando datos…</p>}
      {loadError && <p role="alert" className="text-sm" style={{ color: 'var(--color-admin-danger)' }}>{loadError}</p>}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {([0, 1] as const).map((index) => (
          <BusinessCard
            key={index}
            business={businesses[index]}
            onChange={(field, value) => update(index, field, value)}
            dirty={JSON.stringify(businesses[index]) !== JSON.stringify(saved[index])}
            saving={savingIndex === index}
            status={status[index]}
            onSave={() => void saveCard(index)}
            onDiscard={() => discard(index)}
          />
        ))}
      </div>
    </div>
  );
}
