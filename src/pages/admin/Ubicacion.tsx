import { useState } from 'react';
import { RESTAURANT } from '../../data/mockData';

type LocationFieldProps = {
  label: string;
  value: string;
  field: string;
  type?: string;
  step?: string;
  onChange: (field: string, value: string) => void;
};

function LocationField({ label, value, field, type = 'text', step, onChange }: LocationFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-gold-dim)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-admin-border)'; }}
      />
    </div>
  );
}

export default function AdminUbicacion() {
  const [config, setConfig] = useState({
    lat: String(RESTAURANT.lat),
    lng: String(RESTAURANT.lng),
    radio: String(RESTAURANT.radiusMeters),
    nombre: RESTAURANT.name,
    direccion: RESTAURANT.address,
  });
  const [saved, setSaved] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleFieldChange(field: string, value: string) {
    setConfig((previous) => ({ ...previous, [field]: value }));
  }

  function handleGetCurrentLocation() {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setConfig((p) => ({
          ...p,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { timeout: 8000 }
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>
        Configura la ubicación exacta del restaurante y el radio permitido. Solo los clientes dentro de este radio podrán participar en los sorteos.
      </p>

      {/* Info card */}
      <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: 'var(--color-admin-primary-bg)', border: '1px solid var(--color-admin-primary-border)' }}>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-brand-gold-dim)' }}>Ubicación actual configurada</p>
          <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
            {config.lat}, {config.lng} · Radio: {config.radio} m
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <h3 className="font-display font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Datos del restaurante</h3>
        <LocationField label="Nombre del restaurante" value={config.nombre} field="nombre" onChange={handleFieldChange} />
        <LocationField label="Dirección" value={config.direccion} field="direccion" onChange={handleFieldChange} />
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Coordenadas GPS</h3>
          <button
            onClick={handleGetCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
            style={{ border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)' }}
          >
            {gettingLocation ? (
              <><span className="w-3 h-3 border border-t-transparent rounded-full animate-spin-slow inline-block" /> Obteniendo...</>
            ) : 'Usar mi ubicación actual'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LocationField label="Latitud" value={config.lat} field="lat" type="number" step="0.000001" onChange={handleFieldChange} />
          <LocationField label="Longitud" value={config.lng} field="lng" type="number" step="0.000001" onChange={handleFieldChange} />
        </div>
        <LocationField label="Radio de cobertura (metros)" value={config.radio} field="radio" type="number" onChange={handleFieldChange} />

        {/* Visual radio indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-admin-bg)' }}>
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-dashed" style={{ borderColor: 'var(--color-brand-gold-dim)' }} />
            <div className="absolute inset-2 rounded-full" style={{ background: 'var(--color-brand-gold-dim)', opacity: 0.4 }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-admin-text)' }}>Área de cobertura</p>
            <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Círculo de {config.radio} m de radio desde el punto central</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-2xl font-semibold text-sm transition hover:opacity-90"
        style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
      >
        {saved ? 'Configuración guardada' : 'Guardar configuración'}
      </button>
    </div>
  );
}
