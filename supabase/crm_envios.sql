-- Bandeja de salida hacia el CRM (integracion-crm/).
-- Cada participante nuevo queda "pendiente" aquí; la función /api/crm-sync de Vercel
-- lo envía al CRM y anota el resultado. El CRM nunca bloquea ni demora una participación.
-- Ejecutar una vez en el SQL Editor de Supabase.

create table if not exists public.crm_envios (
  participante_id text primary key references public.participantes(id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'enviado', 'rechazado', 'revision')),
  resultado text,              -- 'creado' | 'duplicado' cuando estado = 'enviado'
  intentos integer not null default 0,
  proximo_intento timestamptz not null default now(),
  ultimo_error text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_envios_pendientes_idx
  on public.crm_envios (proximo_intento)
  where estado = 'pendiente';

drop trigger if exists crm_envios_set_updated_at on public.crm_envios;
create trigger crm_envios_set_updated_at
before update on public.crm_envios
for each row execute function public.set_updated_at();

-- Encola automáticamente cada participación nueva.
create or replace function public.encolar_envio_crm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_envios (participante_id) values (new.id)
  on conflict (participante_id) do nothing;
  return new;
end;
$$;

drop trigger if exists participantes_encolar_crm on public.participantes;
create trigger participantes_encolar_crm
after insert on public.participantes
for each row execute function public.encolar_envio_crm();

-- Solo el servidor (service role) escribe aquí; el panel admin puede leer el estado.
alter table public.crm_envios enable row level security;

drop policy if exists crm_envios_admin_select on public.crm_envios;
create policy crm_envios_admin_select
on public.crm_envios
for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- OPCIONAL: enviar también al CRM a quienes ya participaron antes de esta integración.
-- Descomenta y ejecuta solo si se quiere (el CRM descarta duplicados por celular + fecha de nacimiento).
-- insert into public.crm_envios (participante_id)
-- select id from public.participantes
-- on conflict (participante_id) do nothing;

-- Consultas útiles:
--   Resumen:            select estado, resultado, count(*) from crm_envios group by 1, 2;
--   Para revisar:       select e.*, p.nombres, p.apellidos, p.telefono from crm_envios e
--                       join participantes p on p.id = e.participante_id where e.estado in ('rechazado', 'revision');
--   Reintentar uno:     update crm_envios set estado = 'pendiente', intentos = 0, proximo_intento = now()
--                       where participante_id = '<id>';
