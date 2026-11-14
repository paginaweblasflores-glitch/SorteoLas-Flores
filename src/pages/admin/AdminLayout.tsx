import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { RESTAURANT } from '../../data/mockData';
import AdminDashboard from './Dashboard';
import AdminSorteos from './SorteosAdmin';
import AdminUbicacion from './Ubicacion';
import AdminReportes from './Reportes';
import AdminQR from './QRConfig';

type NavLeaf = { id: string; label: string };
type NavModule = { id: string; label: string; icon: React.ReactNode; children?: NavLeaf[] };

const icon = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);

const NAV: NavModule[] = [
  { id: 'inicio', label: 'Inicio', icon: icon(<><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>) },
  {
    id: 'mod-sorteos',
    label: 'Sorteos',
    icon: icon(<><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z" /><path d="M14 7v10" strokeDasharray="2 2.2" /></>),
    children: [
      { id: 'sorteos', label: 'Todos los sorteos' },
      { id: 'sorteo-nuevo', label: 'Crear sorteo' },
    ],
  },
  {
    id: 'mod-ubicaciones',
    label: 'Negocios',
    icon: icon(<><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12v8h13v-8" /><path d="M10 20v-4.5h4V20" /></>),
    children: [
      { id: 'ubicacion', label: 'Datos de los negocios' },
      { id: 'qr', label: 'QR de Google Maps' },
    ],
  },
  { id: 'reportes', label: 'Reportes', icon: icon(<><path d="M5 19V10" /><path d="M12 19V5" /><path d="M19 19v-6" /></>) },
];

type PageNav = { go: (pageId: string) => void; openRaffle: (raffleId: string) => void; focusRaffle: string | null };

const PAGES: Record<string, (nav: PageNav) => React.ReactNode> = {
  inicio: () => <AdminDashboard />,
  sorteos: ({ focusRaffle }) => <AdminSorteos key={`lista-${focusRaffle ?? ''}`} initialSelectedId={focusRaffle} />,
  'sorteo-nuevo': ({ openRaffle }) => <AdminSorteos key="nuevo" mode="create" onOpenRaffle={openRaffle} />,
  ubicacion: () => <AdminUbicacion />,
  qr: () => <AdminQR />,
  reportes: () => <AdminReportes />,
};

function moduleOf(pageId: string) {
  return NAV.find((m) => m.id === pageId || m.children?.some((c) => c.id === pageId));
}

function pageTitle(pageId: string) {
  const mod = moduleOf(pageId);
  return mod?.children?.find((c) => c.id === pageId)?.label ?? mod?.label ?? '';
}

export default function AdminLayout({ onExit }: { onExit: () => void }) {
  const [active, setActive] = useState('inicio');
  const [focusRaffle, setFocusRaffle] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<string[]>(['mod-sorteos']);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    let cancelled = false;
    void supabase?.auth.getUser().then(({ data }) => {
      if (!cancelled) setAdminEmail(data.user?.email ?? '');
    });
    return () => { cancelled = true; };
  }, []);

  function go(pageId: string) {
    setFocusRaffle(null);
    setActive(pageId);
    setSidebarOpen(false);
  }

  /** Abre un sorteo concreto en "Todos los sorteos" (por ejemplo, recién creado). */
  function openRaffle(raffleId: string) {
    setFocusRaffle(raffleId);
    setActive('sorteos');
    setOpenModules((current) => (current.includes('mod-sorteos') ? current : [...current, 'mod-sorteos']));
  }

  function toggleModule(id: string) {
    setOpenModules((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]));
  }

  const activeModule = moduleOf(active)?.id;
  const rowClass = 'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors hover:bg-[var(--color-admin-sidebar-active)] hover:text-white';

  return (
    <div className="admin-theme flex h-screen overflow-hidden" style={{ background: 'var(--color-admin-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 flex flex-col h-full w-56 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--color-admin-sidebar)', minWidth: '14rem' }}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--color-admin-sidebar-line)' }}>
          <div className="flex items-center justify-center">
            <img src="/marca/logo-circular.webp" alt="Restaurante Las Flores y Hotel Umaru" className="h-[76px] w-[76px] object-contain select-none" draggable={false} />
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Módulos" className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map((mod) => {
            if (!mod.children) {
              const isActive = active === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => go(mod.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={rowClass}
                  style={{ background: isActive ? 'var(--color-admin-sidebar-active)' : undefined, color: isActive ? '#ffffff' : 'var(--color-admin-sidebar-text)' }}
                >
                  {isActive && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: 'var(--color-admin-rose)' }} />}
                  {mod.icon}
                  {mod.label}
                </button>
              );
            }

            const expanded = openModules.includes(mod.id);
            const panelId = `nav-${mod.id}`;
            return (
              <div key={mod.id}>
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className={rowClass}
                  style={{ color: activeModule === mod.id ? '#ffffff' : 'var(--color-admin-sidebar-text)' }}
                >
                  {mod.icon}
                  <span className="flex-1">{mod.label}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-admin-sidebar-muted)' }}><path d="m9 6 6 6-6 6" /></svg>
                </button>
                {expanded && (
                  <ul id={panelId} className="mt-0.5 mb-1.5 ml-[23px] border-l pl-2 space-y-0.5" style={{ borderColor: 'var(--color-admin-sidebar-line)' }}>
                    {mod.children.map((child) => {
                      const isActive = active === child.id;
                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            onClick={() => go(child.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className="relative w-full px-3 py-1.5 rounded-md text-[14px] text-left transition-colors hover:bg-[var(--color-admin-sidebar-active)] hover:text-white"
                            style={{ background: isActive ? 'var(--color-admin-sidebar-active)' : undefined, color: isActive ? '#ffffff' : 'var(--color-admin-sidebar-muted)', fontWeight: isActive ? 600 : 500 }}
                          >
                            {isActive && <span aria-hidden="true" className="absolute -left-[9px] top-1.5 bottom-1.5 w-[2px] rounded-full" style={{ background: 'var(--color-admin-rose)' }} />}
                            {child.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Account */}
        <div ref={accountRef} className="relative px-2.5 py-3 border-t" style={{ borderColor: 'var(--color-admin-sidebar-line)' }}>
          {accountOpen && (
            <div
              role="menu"
              aria-label="Opciones de la cuenta"
              className="absolute bottom-full left-2.5 right-2.5 mb-1 rounded-xl p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)]"
              style={{ background: 'var(--color-admin-sidebar-active)', border: '1px solid #3d3632' }}
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => { setAccountOpen(false); onExit(); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors hover:bg-[#3d3632] hover:text-white"
                style={{ color: 'var(--color-admin-sidebar-text)' }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></svg>
                Cerrar sesión
              </button>
            </div>
          )}
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--color-admin-sidebar-active)]"
            style={{ background: accountOpen ? 'var(--color-admin-sidebar-active)' : undefined }}
          >
            <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--color-admin-primary)', color: '#fffaf8' }}>
              {(adminEmail[0] ?? 'A').toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white leading-tight">Administrador</span>
              <span className="block text-xs truncate" title={adminEmail} style={{ color: 'var(--color-admin-sidebar-muted)' }}>{adminEmail || '—'}</span>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-admin-sidebar-muted)' }}><path d="m6 15 6-6 6 6" /></svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 pb-6 pt-5 lg:pt-7">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              className="lg:hidden -ml-2 p-2 rounded-lg transition-colors hover:bg-[var(--color-admin-neutral-bg)]"
              style={{ color: 'var(--color-admin-text)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-admin-text)' }}>
              {pageTitle(active)}
            </h1>
          </div>
          {PAGES[active]?.({ go, openRaffle, focusRaffle })}
        </main>
      </div>
    </div>
  );
}
