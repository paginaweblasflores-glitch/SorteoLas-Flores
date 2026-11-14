import { useEffect, useId, useState } from 'react';
import { PANEL_USERS } from '../../lib/panelUsers';
import { supabase } from '../../lib/supabase';
import ChoiceSelect from '../customer/ChoiceSelect';

/*
  Inicio de sesión del sistema de sorteos, con la estructura estándar de los sistemas de la empresa:
  fondo oscuro con anillos, tarjeta con encabezado oscuro (logo, título, subtítulo)
  y cuerpo claro con el formulario. Colores propios del sistema: tinta y rojo rosa.
*/

const C = {
  page: '#151110',
  ring: 'rgba(224, 73, 90, 0.09)',
  headerFrom: '#2e2523',
  headerTo: '#1c1917',
  body: '#f5f2ee',
  text: '#1c1917',
  muted: '#6b6259',
  border: '#d9d1c7',
  primary: '#b8202f',
  primaryHover: '#9d1a28',
};

function Icon({ d, className = 'h-4 w-4' }: { d: React.ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const passwordId = useId();
  const [userLabel, setUserLabel] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Iniciar sesión · Panel de sorteos';
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('El sistema todavía no está conectado a Supabase.');
      return;
    }
    const user = PANEL_USERS.find((item) => item.label === userLabel);
    if (!user) {
      setError('Selecciona tu usuario.');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (!signInError && data.user.app_metadata.role === 'admin') {
      setPassword('');
      setLoading(false);
      onLoggedIn();
      return;
    }
    if (!signInError) await supabase.auth.signOut();
    setError(signInError ? 'Contraseña incorrecta.' : 'Este usuario no tiene permisos para entrar al panel.');
    setLoading(false);
  }

  const inputStyle = { background: '#ffffff', borderColor: error ? C.primary : C.border, color: C.text };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ background: C.page, fontFamily: 'var(--font-body)' }}>
      {/* Anillos decorativos */}
      <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-[340px] w-[340px] rounded-full sm:h-[420px] sm:w-[420px]" style={{ border: `56px solid ${C.ring}` }} />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-[320px] w-[320px] rounded-full sm:h-[400px] sm:w-[400px]" style={{ border: `56px solid ${C.ring}` }} />

      <section className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]" style={{ background: C.body, border: '1px solid rgba(255,255,255,0.08)' }}>
        <header className="relative overflow-hidden px-7 pb-7 pt-7 text-center" style={{ background: `linear-gradient(160deg, ${C.headerFrom} 0%, ${C.headerTo} 100%)` }}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full" style={{ border: '18px solid rgba(255,255,255,0.05)' }} />
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]">
            <img src="/marca/logo-circular.webp" alt="Restaurante Las Flores y Hotel Umaru" className="h-full w-full object-contain" />
          </span>
          <h1 className="relative mt-4 text-[1.6rem] font-extrabold leading-tight text-white">Panel de Sorteos</h1>
          <p className="relative mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.68)' }}>Selecciona tu usuario e ingresa tu contraseña.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-7 pb-6 pt-6" style={{ '--color-brand-bg': '#ffffff', '--color-brand-border': C.border, '--color-brand-cream': C.text, '--color-brand-muted': C.muted, '--choice-accent': C.primary } as React.CSSProperties}>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }} aria-hidden="true">
              <Icon d={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18.5a6.5 6.5 0 0 1 11 0" /></>} />
              Usuario
            </p>
            <div className="login-choice">
              <ChoiceSelect
                hideLabel
                label="Usuario"
                required
                value={userLabel}
                options={PANEL_USERS.map((item) => item.label)}
                onChange={(value) => { setUserLabel(value); setError(''); }}
                placeholder="Selecciona tu usuario…"
              />
            </div>
          </div>

          <div>
            <label htmlFor={passwordId} className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>
              <Icon d={<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} />
              Contraseña
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(''); }}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border px-4 pr-12 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(184,32,47,0.2)]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg"
                style={{ color: C.muted }}
              >
                <Icon className="h-5 w-5" d={<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</>} />
              </button>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl px-3.5 py-2.5 text-sm" style={{ background: '#fdeceb', color: '#b42318' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition-colors disabled:opacity-70"
            style={{ background: loading ? C.primaryHover : C.primary, boxShadow: '0 12px 24px -12px rgba(184, 32, 47, 0.7)' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = C.primaryHover; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = C.primary; }}
          >
            {loading
              ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              : <Icon className="h-[18px] w-[18px]" d={<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 17 5-5-5-5" /><path d="M15 12H4" /></>} />}
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="pt-1 text-center text-xs" style={{ color: C.muted }}>Restaurante Las Flores · Hotel Umaru</p>
        </form>
      </section>
    </main>
  );
}
