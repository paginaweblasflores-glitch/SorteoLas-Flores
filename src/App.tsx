import { useState } from 'react';
import AdminLayout from './pages/admin/AdminLayout';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import SorteoPublico from './pages/customer/SorteoPublico';
import { supabase } from './lib/supabase';

type View = 'customer' | 'admin' | 'terms' | 'privacy';

export default function App() {
  const [view, setView] = useState<View>('customer');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('Sorteo@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const publicSorteoSlug = window.location.pathname.match(/^\/sorteo\/([^/]+)\/?$/)?.[1];

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) {
      setAdminLoginError('Configura Supabase Auth para habilitar el acceso administrativo.');
      return;
    }

    setAdminLoginLoading(true);
    setAdminLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail.trim(), password: adminPassword });

    if (!error && data.user.app_metadata.role === 'admin') {
      setShowAdminLogin(false);
      setAdminPassword('');
      setView('admin');
      setAdminLoginLoading(false);
      return;
    }

    if (!error) await supabase.auth.signOut();
    setAdminLoginError(error ? 'Correo o contraseña incorrectos.' : 'Esta cuenta no tiene permisos de administrador.');
    setAdminLoginLoading(false);
  }

  return (
    <>
      {view === 'customer' && (
        <div className="relative">
          <SorteoPublico slug={publicSorteoSlug ? decodeURIComponent(publicSorteoSlug) : null} onOpenLegal={(type) => setView(type)} />
          {!publicSorteoSlug && <button
            onClick={() => { setShowAdminLogin(true); setAdminLoginError(''); }}
            aria-label="Abrir panel de administración"
            title="Panel de administración"
            className="fixed bottom-3 right-4 z-50 hidden h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 hover:opacity-90 md:flex"
            style={{ background: 'rgba(26,16,13,0.9)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>}
          {showAdminLogin && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" role="presentation" onClick={() => setShowAdminLogin(false)}>
              <form
                onSubmit={handleAdminLogin}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
                style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)' }}
              >
                <h2 className="font-display mb-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand-cream)' }}>Acceso administrativo</h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--color-brand-muted)' }}>{supabase ? 'Ingresa tus credenciales de administrador.' : 'Configura Supabase para habilitar el acceso seguro al panel.'}</p>
                {supabase && <input
                  autoComplete="username"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); setAdminLoginError(''); }}
                  placeholder="Correo electrónico"
                  required
                  className="mb-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--color-brand-bg)', border: `1px solid ${adminLoginError ? 'var(--color-brand-error)' : 'var(--color-brand-border)'}`, color: 'var(--color-brand-cream)' }}
                />}
                {supabase && (
                  <div className="relative mb-2">
                    <input
                      autoFocus
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => { setAdminPassword(e.target.value); setAdminLoginError(''); }}
                      placeholder="Contraseña"
                      required
                      className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                      style={{ background: 'var(--color-brand-bg)', border: `1px solid ${adminLoginError ? 'var(--color-brand-error)' : 'var(--color-brand-border)'}`, color: 'var(--color-brand-cream)' }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center justify-center text-sm"
                      style={{ color: 'var(--color-brand-muted)' }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                        {showPassword && <path d="m3 3 18 18" />}
                      </svg>
                    </button>
                  </div>
                )}
                {adminLoginError && <p className="mb-3 text-xs" style={{ color: 'var(--color-brand-error)' }}>{adminLoginError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 rounded-xl px-4 py-3 text-sm" style={{ border: '1px solid var(--color-brand-border)', color: 'var(--color-brand-muted)' }}>Cancelar</button>
                  <button type="submit" disabled={adminLoginLoading || !supabase} className="flex-1 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-button-text)' }}>{adminLoginLoading ? 'Ingresando...' : 'Ingresar'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {view === 'admin' && (
        <AdminLayout onExit={() => { void supabase?.auth.signOut(); setView('customer'); }} />
      )}
      {view === 'terms' && (
        <TermsPage onBack={() => setView('customer')} />
      )}
      {view === 'privacy' && (
        <PrivacyPage onBack={() => setView('customer')} />
      )}
    </>
  );
}
