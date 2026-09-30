import { useState } from 'react';
import { PREMIOS, SORTEOS, type Premio } from '../../data/mockData';

export default function AdminPremios() {
  const [premios, setPremios] = useState<Premio[]>(PREMIOS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', valor: '', imagen: 'Premio', sorteoId: SORTEOS[0]?.id ?? '' });

  function handleAdd() {
    if (!form.nombre || !form.sorteoId) return;
    const nuevo: Premio = {
      id: `pr${Date.now()}`,
      nombre: form.nombre,
      descripcion: form.descripcion,
      valor: Number(form.valor) || 0,
      imagen: form.imagen,
      sorteoId: form.sorteoId,
    };
    setPremios((p) => [nuevo, ...p]);
    setForm({ nombre: '', descripcion: '', valor: '', imagen: 'Premio', sorteoId: SORTEOS[0]?.id ?? '' });
    setShowForm(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{premios.length} premios registrados</p>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>
          + Agregar premio
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
          <h3 className="font-display font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Nuevo Premio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>Nombre del premio</label>
              <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Cena para 2..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>Valor (S/.)</label>
              <input type="number" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} placeholder="150" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>Descripción</label>
              <textarea rows={4} value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del premio..." className="w-full resize-y px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>Sorteo</label>
              <select value={form.sorteoId} onChange={(e) => setForm((p) => ({ ...p, sorteoId: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}>
                {SORTEOS.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="px-5 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>Agregar premio</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm font-medium transition hover:opacity-80" style={{ border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {premios.map((p) => {
          const sorteo = SORTEOS.find((s) => s.id === p.sorteoId);
          return (
            <div key={p.id} className="rounded-2xl p-5" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{p.imagen}</span>
                {p.ganadorId && <span className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(232,197,71,0.15)', color: 'var(--color-brand-gold-dim)' }}>Entregado</span>}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-admin-text)' }}>{p.nombre}</h3>
              <p className="text-xs mb-3 whitespace-pre-line" style={{ color: 'var(--color-admin-muted)' }}>{p.descripcion}</p>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-gold-dim)' }}>S/ {p.valor}</span>
                <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{sorteo?.nombre}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
