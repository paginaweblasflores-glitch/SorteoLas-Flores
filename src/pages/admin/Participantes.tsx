import { useEffect, useState } from 'react';
import { getLocalParticipants } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import BirthDateField from '../customer/BirthDateField';
import { HUAMANGA_DISTRICTS } from '../customer/publicFields';

type ParticipantRow = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  fecha_nacimiento?: string | null;
  participacion_fecha: string;
  created_at: string;
  sorteo_id: string;
  estado: 'activo' | 'ganador' | 'descalificado';
  preguntas_snapshot?: Array<{ id: string; texto: string; respuesta: string | string[] | null }> | null;
};

/** Fecha ISO (AAAA-MM-DD) → dd/mm/aaaa. */
function formatBirthday(iso?: string | null) {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

/** Participantes de un sorteo: búsqueda, filtro por fecha, copiar nombres y respuestas de la encuesta. */
export default function AdminParticipantes({ sorteoId, onCountChange }: { sorteoId: string; onCountChange?: (delta: number) => void }) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<ParticipantRow | null>(null);
  const [deleting, setDeleting] = useState<ParticipantRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadParticipants() {
      if (!supabase) {
        setParticipants(getLocalParticipants().filter((participant) => participant.sorteo_id === sorteoId));
        setLoadError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      const participantsResult = await supabase.from('participantes')
        .select('id, nombres, apellidos, telefono, fecha_nacimiento, departamento, provincia, distrito, participacion_fecha, created_at, sorteo_id, estado, preguntas_snapshot')
        .eq('sorteo_id', sorteoId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (participantsResult.error) {
        setLoadError('No se pudieron cargar los participantes. Verifica tu sesión y los permisos de Supabase.');
        setParticipants([]);
      } else {
        setParticipants(participantsResult.data ?? []);
      }
      setLoading(false);
    }

    void loadParticipants();
    return () => { cancelled = true; };
  }, [reloadKey, sorteoId]);

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || p.telefono.includes(q);
    const matchDate = !filterDate || p.participacion_fecha === filterDate;
    return matchSearch && matchDate;
  });

  async function handleCopyNames() {
    const names = filtered.map((participant) => `${participant.nombres} ${participant.apellidos}`).join('\n');
    await navigator.clipboard.writeText(names);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  function handleRefresh() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}
        />
        <input
          type="date"
          max="9999-12-31"
          value={filterDate}
          onChange={(e) => {
            const nextValue = e.target.value;
            setFilterDate(nextValue && nextValue.split('-')[0].length > 4 ? '' : nextValue);
          }}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)', fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{loading ? 'Cargando participantes...' : `${filtered.length} participante${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}</p>
        <div className="flex gap-2">
          <button type="button" onClick={handleRefresh} aria-busy={loading} className="rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-90 active:scale-95" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-button-text)' }}>{loading ? 'Actualizando...' : 'Actualizar'}</button>
          <button type="button" onClick={handleCopyNames} disabled={filtered.length === 0} className="rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>{copied ? 'Nombres copiados' : 'Copiar nombres'}</button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-admin-bg)' }}>
                {['Nombre completo', 'Teléfono', 'Cumpleaños', 'Región', 'Provincia', 'Distrito', 'Fecha/Hora', 'Acciones'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadError && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-brand-error)' }}>{loadError}</td></tr>
              )}
              {!loadError && !loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>No se encontraron participantes</td></tr>
              )}
              {filtered.map((p, i) => {
                return (
                  <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--color-admin-border)' : undefined }}>
                    <td className="px-5 py-3 align-top" style={{ color: 'var(--color-admin-text)' }}>
                      <p className="font-medium whitespace-nowrap">{p.nombres} {p.apellidos}</p>
                      {(p.preguntas_snapshot ?? []).filter((answer) => answer.respuesta && answer.respuesta.length).map((answer) => (
                        <p key={answer.id} className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{answer.texto}: <span style={{ color: 'var(--color-admin-text)' }}>{Array.isArray(answer.respuesta) ? answer.respuesta.join(', ') : answer.respuesta}</span></p>
                      ))}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>{p.telefono}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap tabular-nums" style={{ color: 'var(--color-admin-muted)' }}>{formatBirthday(p.fecha_nacimiento)}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{p.departamento || 'Ayacucho'}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{p.provincia || 'Huamanga'}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{p.distrito || '—'}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{p.participacion_fecha} {new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setEditing(p)} aria-label={`Editar a ${p.nombres} ${p.apellidos}`} title="Editar" className="row-action">
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
                        </button>
                        <button type="button" onClick={() => setDeleting(p)} aria-label={`Eliminar a ${p.nombres} ${p.apellidos}`} title="Eliminar" className="row-action row-action-danger">
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditParticipant
          participant={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setParticipants((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteParticipant
          participant={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setParticipants((current) => current.filter((item) => item.id !== id));
            setDeleting(null);
            onCountChange?.(-1);
          }}
        />
      )}
      <style>{`.row-action{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;color:var(--color-admin-muted);transition:background-color .15s ease,color .15s ease}.row-action:hover{background:var(--color-admin-bg);color:var(--color-admin-text)}.row-action-danger:hover{background:var(--color-admin-danger-bg);color:var(--color-admin-danger)}`}</style>
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="row-action">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const fieldStyle = { background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' };

function EditParticipant({ participant, onClose, onSaved }: { participant: ParticipantRow; onClose: () => void; onSaved: (updated: ParticipantRow) => void }) {
  const [form, setForm] = useState({
    nombres: participant.nombres,
    apellidos: participant.apellidos,
    telefono: participant.telefono,
    fecha_nacimiento: participant.fecha_nacimiento ?? '',
    distrito: participant.distrito || 'Ayacucho',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (form.nombres.trim().length < 2 || form.apellidos.trim().length < 2) { setError('Escribe el nombre y el apellido.'); return; }
    if (!/^9[0-9]{8}$/.test(form.telefono)) { setError('El celular debe tener 9 dígitos y empezar con 9.'); return; }
    if (!form.fecha_nacimiento) { setError('Escribe una fecha de cumpleaños válida.'); return; }
    setSaving(true);
    setError('');
    const changes = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono,
      fecha_nacimiento: form.fecha_nacimiento,
      departamento: 'Ayacucho',
      provincia: 'Huamanga',
      distrito: form.distrito,
    };
    const { error: updateError } = await supabase.from('participantes').update(changes).eq('id', participant.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.code === '23505'
        ? 'Ese celular ya tiene otra participación registrada ese mismo día.'
        : 'No se pudieron guardar los cambios. Verifica tu sesión e inténtalo de nuevo.');
      return;
    }
    onSaved({ ...participant, ...changes });
  }

  return (
    <Dialog title="Editar participante" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Nombres
            <input value={form.nombres} onChange={(event) => setForm((f) => ({ ...f, nombres: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={fieldStyle} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Apellidos
            <input value={form.apellidos} onChange={(event) => setForm((f) => ({ ...f, apellidos: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={fieldStyle} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Celular (9 dígitos)
            <input inputMode="numeric" maxLength={9} value={form.telefono} onChange={(event) => setForm((f) => ({ ...f, telefono: event.target.value.replace(/\D/g, '') }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none tabular-nums" style={fieldStyle} />
          </label>
          <BirthDateField value={form.fecha_nacimiento} onChange={(iso) => setForm((f) => ({ ...f, fecha_nacimiento: iso }))} />
          <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Distrito
            <select value={form.distrito} onChange={(event) => setForm((f) => ({ ...f, distrito: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={fieldStyle}>
              {HUAMANGA_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Región: Ayacucho · Provincia: Huamanga</p>
        {error && <p role="alert" className="rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-admin-danger)' }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--color-admin-primary)', color: '#fffaf8' }}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteParticipant({ participant, onClose, onDeleted }: { participant: ParticipantRow; onClose: () => void; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!supabase) return;
    setDeleting(true);
    setError('');
    const { data, error: deleteError } = await supabase.from('participantes').delete().eq('id', participant.id).select('id');
    setDeleting(false);
    if (deleteError || !data?.length) {
      setError(deleteError
        ? 'No se pudo eliminar. Verifica tu sesión e inténtalo de nuevo.'
        : 'No se pudo eliminar: falta el permiso en Supabase (ejecuta supabase/participantes_eliminar.sql).');
      return;
    }
    onDeleted(participant.id);
  }

  return (
    <Dialog title="Eliminar participante" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p>Vas a eliminar a <strong>{participant.nombres} {participant.apellidos}</strong> ({participant.telefono}). Se borrará su participación y sus respuestas. Esta acción no se puede deshacer.</p>
        {error && <p role="alert" className="rounded-lg px-3 py-2.5" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-admin-danger)' }}>{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={deleting} className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Cancelar</button>
          <button type="button" onClick={() => void remove()} disabled={deleting} className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--color-admin-danger)', color: '#fff' }}>{deleting ? 'Eliminando…' : 'Eliminar participante'}</button>
        </div>
      </div>
    </Dialog>
  );
}
