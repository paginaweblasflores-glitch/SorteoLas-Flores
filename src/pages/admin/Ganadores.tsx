import { useState } from 'react';
import { GANADORES, SORTEOS, PREMIOS, type Ganador } from '../../data/mockData';

export default function AdminGanadores() {
  const [ganadores, setGanadores] = useState<Ganador[]>(GANADORES);

  function toggleNotificado(id: string) {
    setGanadores((prev) => prev.map((g) => g.id === id ? { ...g, notificado: !g.notificado } : g));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {ganadores.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
          <p className="text-4xl mb-4">Sin ganadores</p>
          <p className="font-display text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>Aún no hay ganadores</p>
          <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Realiza un sorteo para ver los ganadores aquí.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
              <p className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-gold-dim)' }}>{ganadores.length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-admin-muted)' }}>Total ganadores</p>
            </div>
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
              <p className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-success)' }}>{ganadores.filter((g) => g.notificado).length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-admin-muted)' }}>Notificados</p>
            </div>
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
              <p className="font-display text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-error)' }}>{ganadores.filter((g) => !g.notificado).length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-admin-muted)' }}>Pendientes</p>
            </div>
          </div>

          <div className="space-y-3">
            {ganadores.map((g) => {
              const sorteo = SORTEOS.find((s) => s.id === g.sorteoId);
              const premio = PREMIOS.find((p) => p.id === g.premioId);
              return (
                <div key={g.id} className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ background: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--color-admin-primary-bg)' }}>
                    {premio?.imagen ?? 'Premio'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-admin-text)' }}>{g.nombres} {g.apellidos}</p>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-admin-muted)' }}>DNI {g.dni}</span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-brand-gold-dim)' }}>{g.premio}</p>
                    <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                      {sorteo?.nombre} · {g.fecha}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium`} style={{
                      background: g.notificado ? 'var(--color-admin-success-bg)' : 'var(--color-admin-danger-bg)',
                      color: g.notificado ? 'var(--color-admin-success)' : 'var(--color-brand-error)',
                    }}>
                      {g.notificado ? 'Notificado' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => toggleNotificado(g.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80"
                      style={{ border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-text)' }}
                    >
                      {g.notificado ? 'Marcar pendiente' : 'Marcar notificado'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
