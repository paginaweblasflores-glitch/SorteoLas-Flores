import { useEffect, useState } from 'react';
import { SORTEOS, type Sorteo } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  activo: { label: 'Activo', bg: 'var(--color-admin-success-bg)', color: 'var(--color-admin-success)' },
  pendiente: { label: 'Pendiente', bg: 'var(--color-admin-primary-bg)', color: 'var(--color-brand-gold-dim)' },
  finalizado: { label: 'Finalizado', bg: 'var(--color-admin-neutral-bg)', color: 'var(--color-admin-muted)' },
};

const TYPE_OPTIONS = ['Experiencia gastronómica', 'Premios y productos', 'Vale de consumo', 'Otro'];
const EMPTY_FORM = { nombre: '', descripcion: '', tipo: TYPE_OPTIONS[0], fechaInicio: '', fechaFin: '' };

function mapSorteo(row: any): Sorteo {
  const count = (value: unknown) => Array.isArray(value) ? Number((value[0] as { count?: number } | undefined)?.count ?? 0) : 0;
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    tipo: row.tipo ?? TYPE_OPTIONS[0],
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    estado: row.estado,
    participantes: count(row.participantes),
    premios: count(row.premios),
  };
}

export default function AdminSorteos() {
  const [sorteos, setSorteos] = useState<Sorteo[]>(SORTEOS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSorteos() {
      if (!supabase) return;

      const { data, error: loadError } = await supabase
        .from('sorteos')
        .select('id,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,participantes(count),premios(count)')
        .order('created_at', { ascending: false });

      if (loadError) {
        setError('No se pudieron cargar los sorteos desde Supabase.');
      } else {
        setSorteos((data ?? []).map(mapSorteo));
      }
      setLoading(false);
    }

    void loadSorteos();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit() {
    if (!form.nombre || !form.fechaInicio || !form.fechaFin) return;
    setSaving(true);
    setError('');

    if (supabase) {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        tipo: form.tipo,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
      };

      const result = editingId
        ? await supabase.from('sorteos').update(payload).eq('id', editingId)
        : await supabase.from('sorteos').insert({ ...payload, estado: 'pendiente' });

      if (result.error) {
        setError('No se pudo guardar el sorteo. Verifica la configuración de Supabase.');
        setSaving(false);
        return;
      }

      const { data } = await supabase
        .from('sorteos')
        .select('id,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,participantes(count),premios(count)')
        .order('created_at', { ascending: false });
      setSorteos((data ?? []).map(mapSorteo));
      setSaving(false);
      resetForm();
      return;
    }

    if (editingId) {
      setSorteos((prev) => prev.map((sorteo) => sorteo.id === editingId ? { ...sorteo, ...form } : sorteo));
    } else {
      const nuevo: Sorteo = {
        id: `s${Date.now()}`,
        ...form,
        estado: 'pendiente',
        participantes: 0,
        premios: 0,
      };
      setSorteos((prev) => [nuevo, ...prev]);
    }

    setSaving(false);
    resetForm();
  }

  function handleEdit(sorteo: Sorteo) {
    setEditingId(sorteo.id);
    setForm({
      nombre: sorteo.nombre,
      descripcion: sorteo.descripcion,
      tipo: sorteo.tipo,
      fechaInicio: sorteo.fechaInicio,
      fechaFin: sorteo.fechaFin,
    });
    setShowForm(true);
  }

  async function handleActivate(sorteo: Sorteo) {
    setUpdatingId(sorteo.id);
    setError('');

    if (supabase) {
      const { error: updateError } = await supabase
        .from('sorteos')
        .update({ estado: 'activo' })
        .eq('id', sorteo.id);

      if (updateError) {
        setError('No se pudo activar el sorteo. Verifica la configuración de Supabase.');
        setUpdatingId(null);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('sorteos')
        .select('id,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,participantes(count),premios(count)')
        .order('created_at', { ascending: false });

      if (loadError) {
        setError('El sorteo se activó, pero no se pudo actualizar la lista.');
      } else {
        setSorteos((data ?? []).map(mapSorteo));
      }
    } else {
      setSorteos((prev) => prev.map((item) => item.id === sorteo.id ? { ...item, estado: 'activo' } : item));
    }

    setUpdatingId(null);
  }

  async function handleDelete(sorteo: Sorteo) {
    if (!window.confirm(`¿Eliminar el sorteo "${sorteo.nombre}"?`)) return;

    if (supabase) {
      const { error: deleteError } = await supabase.from('sorteos').delete().eq('id', sorteo.id);
      if (deleteError) {
        setError('No se pudo eliminar el sorteo. Verifica la configuración de Supabase.');
        return;
      }
    }

    setSorteos((prev) => prev.filter((item) => item.id !== sorteo.id));
    if (editingId === sorteo.id) resetForm();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{sorteos.length} sorteos registrados</p>
        <button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90"
          style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
        >
          + Nuevo sorteo
        </button>
      </div>

      {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-brand-error)' }}>{error}</p>}

      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
          <h3 className="font-display font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>{editingId ? 'Editar Sorteo' : 'Nuevo Sorteo'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Nombre del sorteo" value={form.nombre} onChange={(v) => setForm((p) => ({ ...p, nombre: v }))} placeholder="Gran Sorteo de..." />
            <AdminField label="Descripción" value={form.descripcion} onChange={(v) => setForm((p) => ({ ...p, descripcion: v }))} placeholder="Descripción breve" />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>Tipo de sorteo</label>
              <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}>
                {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <AdminField label="Fecha inicio" type="date" value={form.fechaInicio} onChange={(v) => setForm((p) => ({ ...p, fechaInicio: v }))} />
            <AdminField label="Fecha fin" type="date" value={form.fechaFin} onChange={(v) => setForm((p) => ({ ...p, fechaFin: v }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear sorteo'}</button>
            <button onClick={resetForm} className="px-5 py-2 rounded-xl text-sm font-medium transition hover:opacity-80" style={{ border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando sorteos...</p> : sorteos.map((s) => {
          const st = STATUS_STYLE[s.estado];
          return (
            <div key={s.id} className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display font-semibold text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>{s.nombre}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--color-admin-muted)' }}>{s.descripcion}</p>
                <div className="flex gap-6 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                  <span>{s.tipo}</span>
                  <span>{s.fechaInicio} → {s.fechaFin}</span>
                  <span>{s.participantes} participantes</span>
                  <span>{s.premios} premios</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Editar</button>
                <button onClick={() => handleDelete(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ border: '1px solid var(--color-admin-danger-border)', color: 'var(--color-brand-error)' }}>Eliminar</button>
                {s.estado !== 'activo' && (
                  <button onClick={() => void handleActivate(s)} disabled={updatingId !== null} className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80 disabled:opacity-50" style={{ background: 'var(--color-admin-success-bg)', color: 'var(--color-admin-success)' }}>{updatingId === s.id ? 'Activando...' : 'Activar'}</button>
                )}
                {s.estado === 'activo' && (
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80" style={{ background: 'var(--color-admin-primary-bg)', color: 'var(--color-brand-gold-dim)' }}>Detener</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-admin-muted)' }}>{label}</label>
      <input
        type={type}
        max={type === 'date' ? '9999-12-31' : undefined}
        value={value}
        onChange={(e) => {
          const nextValue = e.target.value;
          if (type === 'date' && nextValue && nextValue.split('-')[0].length > 4) {
            onChange('');
            return;
          }
          onChange(nextValue);
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition"
        style={{ background: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-gold-dim)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-admin-border)'; }}
      />
    </div>
  );
}
