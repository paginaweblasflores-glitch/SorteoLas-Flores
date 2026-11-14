import { useEffect, useState } from 'react';
import AdminLayout from './pages/admin/AdminLayout';
import LoginPage from './pages/admin/LoginPage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import SorteoPublico from './pages/customer/SorteoPublico';
import { supabase } from './lib/supabase';
import type { BrandId } from './assets/raffleLogos';

/*
  Rutas:
  - /sorteo/<enlace>  → página pública del sorteo (lo que abren los QR).
  - cualquier otra    → inicio de sesión del panel; si ya hay sesión de administrador, el panel.
*/

type RaffleView = 'raffle' | 'terms' | 'privacy';

export default function App() {
  const publicSorteoSlug = window.location.pathname.match(/^\/sorteo\/([^/]+)\/?$/)?.[1];
  return publicSorteoSlug ? <PublicRaffle slug={decodeURIComponent(publicSorteoSlug)} /> : <AdminArea />;
}

function PublicRaffle({ slug }: { slug: string }) {
  const [view, setView] = useState<RaffleView>('raffle');
  const [legalBrand, setLegalBrand] = useState<BrandId | null>(null);

  if (view === 'terms') return <TermsPage brand={legalBrand} onBack={() => setView('raffle')} />;
  if (view === 'privacy') return <PrivacyPage brand={legalBrand} onBack={() => setView('raffle')} />;
  return <SorteoPublico slug={slug} onOpenLegal={(type, brand) => { setLegalBrand(brand); setView(type); }} />;
}

function AdminArea() {
  const [status, setStatus] = useState<'checking' | 'login' | 'admin'>('checking');

  // Si ya hay una sesión de administrador guardada, se entra directo al panel.
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      if (!supabase) { setStatus('login'); return; }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data.session?.user.app_metadata.role === 'admin' ? 'admin' : 'login');
    }
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status === 'admin') document.title = 'Panel de sorteos · Las Flores y Umaru';
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#151110' }} role="status" aria-live="polite">
        <span className="sr-only">Cargando</span>
        <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      </div>
    );
  }

  if (status === 'login') return <LoginPage onLoggedIn={() => setStatus('admin')} />;

  return (
    <AdminLayout onExit={() => {
      void supabase?.auth.signOut();
      setStatus('login');
    }} />
  );
}
