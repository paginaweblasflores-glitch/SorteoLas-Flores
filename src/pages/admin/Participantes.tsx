import { useEffect, useState } from 'react';
import { getLocalParticipants } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

type ParticipantRow = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  distrito?: string | null;
  participacion_fecha: string;
  created_at: string;
  sorteo_id: string;
  estado: 'activo' | 'ganador' | 'descalificado';
  preguntas_snapshot?: Array<{ id: string; texto: string; respuesta: string | string[] | null }> | null;
};

/** Participantes de un sorteo: búsqueda, filtro por fecha, copiar nombres y respuestas de la encuesta. */
export default function AdminParticipantes({ sorteoId }: { sorteoId: string }) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
        .select('id, nombres, apellidos, telefono, distrito, participacion_fecha, created_at, sorteo_id, estado, preguntas_snapshot')
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
                {['Nombre completo', 'Teléfono', 'Distrito', 'Fecha/Hora', 'Estado'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadError && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-brand-error)' }}>{loadError}</td></tr>
              )}
              {!loadError && !loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>No se encontraron participantes</td></tr>
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
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{p.distrito ?? '—'}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-admin-muted)' }}>{p.participacion_fecha} {new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{
                        background: p.estado === 'ganador' ? 'var(--color-admin-primary-bg)' : 'var(--color-admin-success-bg)',
                        color: p.estado === 'ganador' ? 'var(--color-brand-gold-dim)' : 'var(--color-admin-success)',
                      }}>
                        {p.estado === 'ganador' ? 'Ganador' : p.estado === 'descalificado' ? 'Descalificado' : 'Activo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
