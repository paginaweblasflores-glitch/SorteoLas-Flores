import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type ReportRaffle = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'pendiente' | 'finalizado';
  participantes: Array<{ count: number }>;
};

type ReportParticipant = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  fecha_nacimiento: string;
  departamento: string;
  provincia: string;
  distrito: string;
  participacion_fecha: string;
  created_at: string;
  sorteo_id: string;
  estado: 'activo' | 'ganador' | 'descalificado';
};

type DailyStat = { date: string; label: string; count: number };

type ReportData = {
  raffles: ReportRaffle[];
  totalParticipants: number;
  totalWinners: number;
  notifiedWinners: number;
  dailyStats: DailyStat[];
};

const EMPTY_DATA: ReportData = {
  raffles: [],
  totalParticipants: 0,
  totalWinners: 0,
  notifiedWinners: 0,
  dailyStats: [],
};

const PAGE_SIZE = 1000;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function csvCell(value: string | null | undefined) {
  const text = value ?? '';
  const safeText = /^[\t\r=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 truncate text-right text-xs" style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-admin-bg)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--color-admin-text)' }}>{value}</span>
    </div>
  );
}

export default function AdminReportes() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      if (!supabase) {
        setError('Conecta Supabase para consultar los reportes.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [rafflesResult, participantsResult, winnersResult, notifiedWinnersResult] = await Promise.all([
          supabase.from('sorteos')
            .select('id,nombre,fecha_inicio,fecha_fin,estado,participantes(count)')
            .order('created_at', { ascending: false }),
          supabase.from('participantes').select('id', { count: 'exact', head: true }),
          supabase.from('ganadores').select('id', { count: 'exact', head: true }),
          supabase.from('ganadores').select('id', { count: 'exact', head: true }).eq('notificado', true),
        ]);

        if (rafflesResult.error) throw new Error(rafflesResult.error.message);
        if (participantsResult.error) throw new Error(participantsResult.error.message);
        if (winnersResult.error) throw new Error(winnersResult.error.message);
        if (notifiedWinnersResult.error) throw new Error(notifiedWinnersResult.error.message);

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
        const firstDayKey = dateKey(firstDay);
        const participantDates: string[] = [];
        let offset = 0;

        while (true) {
          const activityResult = await supabase.from('participantes')
            .select('id,participacion_fecha')
            .gte('participacion_fecha', firstDayKey)
            .order('participacion_fecha', { ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

          if (activityResult.error) throw new Error(activityResult.error.message);
          const page = activityResult.data ?? [];
          participantDates.push(...page.map((participant) => participant.participacion_fecha));
          if (page.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }

        if (cancelled) return;

        const dailyCounts = new Map<string, number>();
        for (const date of participantDates) {
          dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
        }
        const dailyStats = Array.from({ length: 14 }, (_, index) => {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13 + index);
          const key = dateKey(day);
          return {
            date: key,
            label: day.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
            count: dailyCounts.get(key) ?? 0,
          };
        });

        setData({
          raffles: (rafflesResult.data ?? []) as ReportRaffle[],
          totalParticipants: participantsResult.count ?? 0,
          totalWinners: winnersResult.count ?? 0,
          notifiedWinners: notifiedWinnersResult.count ?? 0,
          dailyStats,
        });
      } catch (loadError) {
        if (!cancelled) {
          const detail = loadError instanceof Error ? ` ${loadError.message}` : '';
          setError(`No se pudieron cargar los reportes. Verifica los permisos de Supabase.${detail}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReports();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const today = dateKey(new Date());
  const activeRaffles = data?.raffles.filter((raffle) =>
    raffle.estado === 'activo' && today >= raffle.fecha_inicio && today <= raffle.fecha_fin,
  ).length ?? 0;
  const raffleStats = (data?.raffles ?? []).map((raffle) => ({
    id: raffle.id,
    nombre: raffle.nombre,
    participantes: raffle.participantes?.[0]?.count ?? 0,
  }));
  const maxParticipants = Math.max(...raffleStats.map((raffle) => raffle.participantes), 1);
  const maxDaily = Math.max(...(data?.dailyStats ?? []).map((day) => day.count), 1);

  async function exportCSV() {
    if (!supabase) {
      setError('Conecta Supabase para exportar los participantes.');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const raffleNames = new Map((data?.raffles ?? []).map((raffle) => [raffle.id, raffle.nombre]));
      const participants: ReportParticipant[] = [];
      let offset = 0;

      while (true) {
        const result = await supabase.from('participantes')
          .select('id,nombres,apellidos,telefono,fecha_nacimiento,departamento,provincia,distrito,participacion_fecha,created_at,sorteo_id,estado')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (result.error) throw new Error(result.error.message);
        const page = (result.data ?? []) as ReportParticipant[];
        participants.push(...page);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      const header = [
        'Nombres', 'Apellidos', 'Celular', 'Fecha de nacimiento', 'Departamento',
        'Provincia', 'Distrito', 'Fecha de participación', 'Fecha y hora de registro', 'Sorteo', 'Estado',
      ];
      const rows = participants.map((participant) => [
        participant.nombres,
        participant.apellidos,
        participant.telefono,
        participant.fecha_nacimiento,
        participant.departamento,
        participant.provincia,
        participant.distrito,
        participant.participacion_fecha,
        new Date(participant.created_at).toLocaleString('es-PE'),
        raffleNames.get(participant.sorteo_id) ?? 'Sorteo',
        participant.estado,
      ]);
      const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `participantes_${dateKey(new Date())}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      const detail = exportError instanceof Error ? ` ${exportError.message}` : '';
      setError(`No se pudo exportar la lista de participantes.${detail}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Indicadores y participaciones registradas en Supabase</p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
          className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white disabled:opacity-50"
          style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}
        >
          {loading ? 'Actualizando...' : 'Actualizar datos'}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--color-admin-danger-bg)', borderColor: 'var(--color-admin-danger-border)', color: 'var(--color-brand-error)' }}>{error}</p>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total participantes', value: data?.totalParticipants, color: 'var(--color-admin-text)' },
          { label: 'Ganadores', value: data?.totalWinners, color: 'var(--color-brand-gold-dim)' },
          { label: 'Sorteos publicados', value: activeRaffles, color: 'var(--color-admin-success)' },
          { label: 'Ganadores notificados', value: data?.notifiedWinners, color: 'var(--color-admin-muted)' },
        ].map((metric) => (
          <article key={metric.label} className="rounded-xl border px-4 py-4 sm:px-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums" style={{ color: metric.color }}>{!data ? '—' : metric.value ?? 0}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border p-5 sm:p-6" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Participantes por sorteo</h2>
        {loading && !data ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando datos...</p>
          : !data ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Datos no disponibles.</p>
            : raffleStats.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>No hay sorteos registrados.</p>
            : <div className="space-y-3">{raffleStats.map((raffle) => (
              <BarRow key={raffle.id} label={raffle.nombre} value={raffle.participantes} max={maxParticipants} color="var(--color-brand-gold-dim)" />
            ))}</div>}
      </section>

      <section className="rounded-xl border p-5 sm:p-6" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Actividad diaria — últimos 14 días</h2>
        {loading && !data ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando datos...</p>
          : !data ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Datos no disponibles.</p>
            : <div className="space-y-2">{data.dailyStats.map((day) => (
            <BarRow key={day.date} label={day.label} value={day.count} max={maxDaily} color="var(--color-admin-success)" />
          ))}</div>}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Exportar datos</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Descarga todos los participantes y los datos disponibles en formato CSV.</p>
        </div>
        <button
          type="button"
          onClick={() => void exportCSV()}
          disabled={exporting || loading || !data?.totalParticipants}
          className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
        >
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </section>
    </div>
  );
}
