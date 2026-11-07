import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getBrand } from '../../assets/raffleLogos';
import { DEFAULT_BUSINESSES, isGoogleMapsUrl, loadBusinesses, saveBusinesses, type Business } from '../../lib/businesses';

/*
  QR de Google Maps de cada negocio. Usa los mismos datos que "Datos de los negocios":
  aquí solo se ajusta el enlace de Google Maps y se descarga el QR.
*/

function slugify(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function QrCard({ business, onMapsUrl }: { business: Business; onMapsUrl: (value: string) => void }) {
  const brand = getBrand(business.brand);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const url = business.mapsUrl.trim();
  const invalid = url && !isGoogleMapsUrl(url) ? 'Pega un enlace https de Google Maps.' : '';

  useEffect(() => {
    let cancelled = false;
    if (!url || invalid) { setQr(''); return () => { cancelled = true; }; }
    QRCode.toDataURL(url, { width: 560, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1c1917', light: '#ffffff' } })
      .then((dataUrl) => { if (!cancelled) setQr(dataUrl); })
      .catch(() => { if (!cancelled) setQr(''); });
    return () => { cancelled = true; };
  }, [url, invalid]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="flex flex-col rounded-2xl border" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
      <header className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--color-admin-border)' }}>
        <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-white p-1.5" style={{ border: '1px solid var(--color-admin-border)' }}>
          <img src={brand.logo} alt="" className="max-h-full max-w-full object-contain" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-admin-text)' }}>{business.name}</h2>
          <p className="truncate text-xs" style={{ color: 'var(--color-admin-muted)' }}>{business.address}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>
          Enlace de Google Maps
          <input
            type="url"
            value={business.mapsUrl}
            onChange={(event) => onMapsUrl(event.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-admin-text)]"
            style={{ background: 'var(--color-admin-bg)', borderColor: invalid ? 'var(--color-admin-danger)' : 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}
          />
          {invalid && <span role="alert" className="mt-1 block" style={{ color: 'var(--color-admin-danger)' }}>{invalid}</span>}
        </label>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl p-5" style={{ background: 'var(--color-admin-bg)' }}>
          {qr ? (
            <>
              <img src={qr} alt={`Código QR de ${business.name}`} className="h-52 w-52 rounded-lg bg-white p-2" />
              <div className="flex flex-wrap justify-center gap-2">
                <a href={qr} download={`qr-${slugify(business.name) || business.brand}.png`} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--color-admin-primary)', color: '#fffaf8' }}>Descargar PNG</a>
                <button type="button" onClick={() => void copyLink()} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
                <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Probar enlace</a>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>Pega el enlace de Google Maps para generar el QR.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function AdminQR() {
  const [businesses, setBusinesses] = useState<[Business, Business]>(DEFAULT_BUSINESSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadBusinesses().then(({ businesses: loaded, error }) => {
      if (cancelled) return;
      setBusinesses(loaded);
      if (error) setMessage({ tone: 'error', text: error });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function setMapsUrl(index: 0 | 1, value: string) {
    setBusinesses((current) => {
      const next: [Business, Business] = [{ ...current[0] }, { ...current[1] }];
      next[index] = { ...next[index], mapsUrl: value };
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  async function handleSave() {
    if (businesses.some((business) => !isGoogleMapsUrl(business.mapsUrl.trim()))) {
      setMessage({ tone: 'error', text: 'Pega un enlace https de Google Maps para cada negocio.' });
      return;
    }
    setSaving(true);
    const error = await saveBusinesses(businesses);
    setSaving(false);
    if (error) { setMessage({ tone: 'error', text: error }); return; }
    setDirty(false);
    setMessage({ tone: 'ok', text: 'Enlaces guardados.' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="max-w-2xl text-sm" style={{ color: 'var(--color-admin-muted)' }}>
        Cada QR abre la ubicación del negocio en Google Maps. El nombre y la dirección se editan en «Datos de los negocios».
      </p>
      {loading && <p role="status" className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando…</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <QrCard business={businesses[0]} onMapsUrl={(value) => setMapsUrl(0, value)} />
        <QrCard business={businesses[1]} onMapsUrl={(value) => setMapsUrl(1, value)} />
      </div>

      <details className="rounded-2xl border px-5 py-4 text-sm" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}>
        <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-admin-text)' }}>¿Cómo obtengo el enlace exacto de Google Maps?</summary>
        <p className="mt-2">Abre Google Maps, busca el negocio, toca «Compartir» y copia el enlace (empieza con https://maps.app.goo.gl/). Pégalo aquí y guarda. Así el QR abre la ficha exacta del negocio en lugar de una búsqueda.</p>
      </details>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-3 border-t px-6 py-4" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)' }}>
        {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className="mr-auto text-sm" style={{ color: message.tone === 'error' ? 'var(--color-admin-danger)' : 'var(--color-admin-success)' }}>{message.text}</p>}
        {!message && dirty && <p className="mr-auto text-sm" style={{ color: 'var(--color-admin-muted)' }}>Tienes cambios sin guardar.</p>}
        <button type="button" onClick={() => void handleSave()} disabled={loading || saving || !dirty} className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50" style={{ background: 'var(--color-admin-primary)', color: '#fffaf8' }}>
          {saving ? 'Guardando…' : 'Guardar enlaces'}
        </button>
      </div>
    </div>
  );
}
