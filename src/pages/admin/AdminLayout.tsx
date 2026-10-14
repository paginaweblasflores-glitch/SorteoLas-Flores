import { useState } from 'react';
import { RESTAURANT } from '../../data/mockData';
import BrandWordmark from '../../components/BrandWordmark';
import AdminDashboard from './Dashboard';
import AdminSorteos from './SorteosAdmin';
import AdminParticipantes from './Participantes';
import AdminUbicacion from './Ubicacion';
import AdminReportes from './Reportes';
import AdminQR from './QRConfig';

type NavItem = {
  id: string;
  label: string;
  icon: string;
  group?: string;
};

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '', group: 'General' },
  { id: 'sorteos', label: 'Sorteos', icon: '', group: 'Gestión' },
  { id: 'participantes', label: 'Participantes', icon: '', group: 'Gestión' },
  { id: 'ubicacion', label: 'Ubicación', icon: '', group: 'Config' },
  { id: 'qr', label: 'Códigos QR', icon: '', group: 'Config' },
  { id: 'reportes', label: 'Reportes', icon: '', group: 'Config' },
];

const PAGES: Record<string, React.ReactNode> = {
  dashboard: <AdminDashboard />,
  sorteos: <AdminSorteos />,
  participantes: <AdminParticipantes />,
  ubicacion: <AdminUbicacion />,
  qr: <AdminQR />,
  reportes: <AdminReportes />,
};

export default function AdminLayout({ onExit }: { onExit: () => void }) {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-admin-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 flex flex-col h-full w-64 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--color-admin-sidebar)', minWidth: '16rem' }}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-center">
              <BrandWordmark compact />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="text-xs uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>{group}</p>
              {NAV.filter((n) => n.group === group).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                  style={{
                    background: active === item.id ? 'rgba(255,255,255,0.16)' : 'transparent',
                    color: active === item.id ? '#ffffff' : 'rgba(255,255,255,0.8)',
                    borderLeft: active === item.id ? '2px solid #e4f0e8' : '2px solid transparent',
                  }}
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Exit to customer view */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={onExit}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            ← Ver vista de cliente
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
          <button
            className="lg:hidden p-2 rounded-lg"
            style={{ color: 'var(--color-admin-text)' }}
            onClick={() => setSidebarOpen(true)}
          >
            Menú
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', letterSpacing: '0.12em' }}>Panel de administración</p>
            <h1 className="font-display font-bold text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>
              {NAV.find((n) => n.id === active)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium" style={{ color: 'var(--color-admin-text)' }}>Administrador</p>
              <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Sorteo@gmail.com</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>A</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {PAGES[active]}
        </main>
      </div>
    </div>
  );
}
