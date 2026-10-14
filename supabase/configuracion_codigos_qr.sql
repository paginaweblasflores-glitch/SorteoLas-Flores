-- Run this once in the Supabase SQL Editor to enable shared business map QR codes.
create table if not exists public.configuracion_codigos_qr (
  id smallint primary key default 1 check (id = 1),
  negocios jsonb not null check (
    case when jsonb_typeof(negocios) = 'array' then jsonb_array_length(negocios) = 2 else false end
  ),
  updated_at timestamptz not null default now()
);

drop trigger if exists configuracion_codigos_qr_set_updated_at on public.configuracion_codigos_qr;
create trigger configuracion_codigos_qr_set_updated_at
before update on public.configuracion_codigos_qr
for each row execute function public.set_updated_at();

alter table public.configuracion_codigos_qr enable row level security;

drop policy if exists configuracion_codigos_qr_admin_all on public.configuracion_codigos_qr;
create policy configuracion_codigos_qr_admin_all
on public.configuracion_codigos_qr for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
