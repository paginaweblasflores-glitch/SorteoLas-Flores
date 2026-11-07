import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type DashboardRaffle = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'pendiente' | 'finalizado';
  participantes: Array<{ count: number }>;
};

type RecentParticipant = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  distrito?: string | null;
  created_at: string;
  sorteo_id: string;
  estado: 'activo' | 'ganador' | 'descalificado';
};

type ActivityDay = { date: string; count: number };

type DashboardData = {
  raffles: DashboardRaffle[];
  recentParticipants: RecentParticipant[];
  activity: ActivityDay[];
  totalParticipants: number;
  todayParticipants: number;
  totalWinners: number;
};

const EMPTY_DATA: DashboardData = {
  raffles: [],
  recentParticipants: [],
  activity: [],
  totalParticipants: 0,
  todayParticipants: 0,
  totalWinners: 0,
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function raffleStatus(raffle: DashboardRaffle) {
  if (raffle.estado === 'finalizado' || localDateKey(new Date()) > raffle.fecha_fin) return 'Finalizado';
  if (raffle.estado === 'pendiente' || localDateKey(new Date()) < raffle.fecha_inicio) return 'Borrador';
  return 'Publicado';
}

function statusColors(status: string) {
  if (status === 'Publicado') return { background: 'var(--color-admin-success-bg)', color: 'var(--color-admin-success)' };
  if (status === 'Finalizado') return { background: 'var(--color-admin-neutral-bg)', color: 'var(--color-admin-muted)' };
  return { background: 'var(--color-admin-warning-bg)', color: 'var(--color-admin-warning)' };
}

export default function AdminDashboard() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!supabase) {
      setData(EMPTY_DATA);
      setError('Conecta Supabase para consultar la información real del panel.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

    const [rafflesResult, participantCountResult, todayCountResult, winnersResult, recentResult, activityResult] = await Promise.all([
      supabase.from('sorteos')
        .select('id,nombre,fecha_inicio,fecha_fin,estado,participantes(count)')
        .order('created_at', { ascending: false }),
      supabase.from('participantes').select('id', { count: 'exact', head: true }),
      supabase.from('participantes').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('ganadores').select('id', { count: 'exact', head: true }),
      supabase.from('participantes')
        .select('id,nombres,apellidos,telefono,distrito,created_at,sorteo_id,estado')
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('participantes').select('created_at').gte('created_at', weekStart),
    ]);

    const failed = [rafflesResult, participantCountResult, todayCountResult, winnersResult, recentResult, activityResult].some((result) => result.error);
    if (failed) {
      setError('No se pudieron cargar todos los datos. Verifica la sesión administradora y los permisos de Supabase.');
    }

    const raffleRows = rafflesResult.data ?? [];
    const activityCounts = new Map<string, number>();
    for (const participant of activityResult.data ?? []) {
      const key = localDateKey(new Date(participant.created_at));
      activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
    }
    const activity: ActivityDay[] = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
      const key = localDateKey(date);
      return { date: key, count: activityCounts.get(key) ?? 0 };
    });

    setData({
      raffles: raffleRows as DashboardRaffle[],
      recentParticipants: (recentResult.data ?? []) as RecentParticipant[],
      activity,
      totalParticipants: participantCountResult.count ?? 0,
      todayParticipants: todayCountResult.count ?? 0,
      totalWinners: winnersResult.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, reloadKey]);

  const raffleNames = new Map(data.raffles.map((raffle) => [raffle.id, raffle.nombre]));
  const maxActivity = Math.max(...data.activity.map((day) => day.count), 1);
  const activeCount = data.raffles.filter((raffle) => raffleStatus(raffle) === 'Publicado').length;

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-admin-muted)' }}>Resumen operativo</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading} className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white disabled:opacity-50" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>{loading ? 'Actualizando...' : 'Actualizar datos'}</button>
    </div>

    {error && <p role="alert" className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--color-admin-danger-bg)', borderColor: 'var(--color-admin-danger-border)', color: 'var(--color-brand-error)' }}>{error}</p>}

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Participantes hoy" value={loading ? '—' : data.todayParticipants} detail="Registros desde medianoche" />
      <Metric label="Participantes totales" value={loading ? '—' : data.totalParticipants} detail="En todos los sorteos" />
      <Metric label="Sorteos publicados" value={loading ? '—' : activeCount} detail={`${data.raffles.length} sorteos en total`} />
      <Metric label="Ganadores" value={loading ? '—' : data.totalWinners} detail="Registros históricos" />
    </section>

    <section className="overflow-hidden rounded-xl border" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--color-admin-border)' }}>
        <div><h2 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Todos los sorteos</h2><p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Listado completo de sorteos registrados en el sistema</p></div>
        <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--color-admin-bg)', color: 'var(--color-admin-muted)' }}>{data.raffles.length} en total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr style={{ background: 'var(--color-admin-bg)' }}>{['Sorteo', 'Estado', 'Vigencia', 'Participantes'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-admin-muted)' }}>{heading}</th>)}</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-5 py-9 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando sorteos...</td></tr>}
            {!loading && data.raffles.length === 0 && <tr><td colSpan={4} className="px-5 py-9 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>No hay sorteos registrados.</td></tr>}
            {!loading && data.raffles.map((raffle) => {
              const status = raffleStatus(raffle);
              const colors = statusColors(status);
              const count = raffle.participantes?.[0]?.count ?? 0;
              return <tr key={raffle.id} className="border-t" style={{ borderColor: 'var(--color-admin-border)' }}>
                <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--color-admin-text)' }}>{raffle.nombre}</td>
                <td className="px-5 py-3.5"><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={colors}>{status}</span></td>
                <td className="px-5 py-3.5 whitespace-nowrap text-xs" style={{ color: 'var(--color-admin-muted)' }}>{formatDate(raffle.fecha_inicio)} – {formatDate(raffle.fecha_fin)}</td>
                <td className="px-5 py-3.5 tabular-nums" style={{ color: 'var(--color-admin-text)' }}>{count}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <div className="mb-5"><h2 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Actividad reciente</h2><p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Participaciones de los últimos 7 días</p></div>
        <div className="grid grid-cols-7 items-end gap-2">
          {data.activity.map((day) => {
            const isToday = day.date === localDateKey(new Date());
            const barHeight = day.count ? Math.max((day.count / maxActivity) * 82, 8) : 3;
            return <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
              <span className="text-xs tabular-nums" style={{ color: isToday ? 'var(--color-brand-gold-dim)' : 'var(--color-admin-muted)' }}>{day.count}</span>
              <div className="flex h-[84px] w-full items-end"><div className="w-full rounded-t-sm" style={{ height: `${barHeight}px`, background: isToday ? 'var(--color-admin-primary)' : 'var(--color-admin-chart-muted)' }} /></div>
              <span className="text-xs capitalize" style={{ color: 'var(--color-admin-muted)' }}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short' })}</span>
            </div>;
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--color-admin-border)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Últimas participaciones</h2><p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Registros más recientes de todos los sorteos</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr style={{ background: 'var(--color-admin-bg)' }}>{['Participante', 'Sorteo', 'Fecha y hora', 'Estado'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-admin-muted)' }}>{heading}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando participaciones...</td></tr>}
              {!loading && data.recentParticipants.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>Todavía no hay participaciones.</td></tr>}
              {!loading && data.recentParticipants.map((participant) => {
                const colors = participant.estado === 'ganador'
                  ? { background: 'var(--color-admin-warning-bg)', color: 'var(--color-admin-warning)' }
                  : participant.estado === 'descalificado'
                    ? { background: 'var(--color-admin-danger-bg)', color: 'var(--color-brand-error)' }
                    : { background: 'var(--color-admin-success-bg)', color: 'var(--color-admin-success)' };
                return <tr key={participant.id} className="border-t" style={{ borderColor: 'var(--color-admin-border)' }}>
                  <td className="px-5 py-3"><p className="font-medium" style={{ color: 'var(--color-admin-text)' }}>{participant.nombres} {participant.apellidos}</p><p className="mt-0.5 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{participant.telefono}{participant.distrito ? ` · ${participant.distrito}` : ''}</p></td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{raffleNames.get(participant.sorteo_id) ?? 'Sorteo'}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--color-admin-muted)' }}>{new Date(participant.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-5 py-3"><span className="rounded-full px-2 py-1 text-xs font-semibold" style={colors}>{participant.estado === 'ganador' ? 'Ganador' : participant.estado === 'descalificado' ? 'Descalificado' : 'Activo'}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="rounded-xl border px-4 py-4 sm:px-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
    <p className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>{label}</p>
    <p className="mt-3 text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-admin-text)' }}>{value}</p>
    <p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{detail}</p>
  </article>;
}