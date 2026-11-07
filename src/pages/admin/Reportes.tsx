import { PARTICIPANTES, SORTEOS, GANADORES, PREMIOS } from '../../data/mockData';

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-right truncate" style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--color-admin-bg)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right" style={{ color: 'var(--color-admin-text)' }}>{value}</span>
    </div>
  );
}

export default function AdminReportes() {
  const totalParticipantes = PARTICIPANTES.length;
  const totalGanadores = GANADORES.length;
  const activoSorteos = SORTEOS.filter((s) => s.estado === 'activo').length;
  const totalPremiosEntregados = GANADORES.length;

  // Per-sorteo stats
  const sorteoStats = SORTEOS.map((s) => ({
    nombre: s.nombre,
    participantes: PARTICIPANTES.filter((p) => p.sorteoId === s.id).length,
  }));
  const maxPart = Math.max(...sorteoStats.map((s) => s.participantes), 1);

  // Per-day stats (last 14 days)
  const dailyStats: { date: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    dailyStats.push({
      date,
      label: d.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      count: PARTICIPANTES.filter((p) => p.fecha === date).length,
    });
  }
  const maxDaily = Math.max(...dailyStats.map((d) => d.count), 1);

  function exportCSV() {
    const header = 'Nombres,Apellidos,DNI,Teléfono,Correo,Fecha,Hora,Sorteo,Estado\n';
    const rows = PARTICIPANTES.map((p) => {
      const sorteo = SORTEOS.find((s) => s.id === p.sorteoId)?.nombre ?? '';
      return `${p.nombres},${p.apellidos},${p.dni},${p.telefono},${p.correo},${p.fecha},${p.hora},${sorteo},${p.estado}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total participantes', val: totalParticipantes, icon: '', color: 'var(--color-admin-text)' },
          { label: 'Ganadores', val: totalGanadores, icon: '', color: 'var(--color-brand-gold-dim)' },
          { label: 'Sorteos activos', val: activoSorteos, icon: '', color: 'var(--color-admin-success)' },
          { label: 'Premios entregados', val: totalPremiosEntregados, icon: '', color: 'var(--color-admin-muted)' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-5" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
            <p className="text-xl mb-2">{c.icon}</p>
            <p className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: c.color }}>{c.val}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-admin-muted)' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Participantes por sorteo */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <h3 className="font-display font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Participantes por sorteo</h3>
        <div className="space-y-3">
          {sorteoStats.map((s) => (
            <BarRow key={s.nombre} label={s.nombre} value={s.participantes} max={maxPart} color="var(--color-brand-gold-dim)" />
          ))}
        </div>
      </div>

      {/* Daily chart */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <h3 className="font-display font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Actividad diaria — últimos 14 días</h3>
        <div className="space-y-2">
          {dailyStats.map((d) => (
            <BarRow key={d.date} label={d.label} value={d.count} max={maxDaily} color="var(--color-admin-success)" />
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Exportar datos</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>Descarga la lista completa de participantes en formato CSV</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90"
          style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}
        >
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
