-- Schema for the Las Flores raffle application.
-- Run this file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.sorteos (
  id text primary key default gen_random_uuid()::text,
  slug text,
  nombre text not null,
  descripcion text not null default '',
  tipo text not null default 'Experiencia gastronómica',
  imagen_url text,
  premio_nombre text,
  premio_descripcion text,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'pendiente' check (estado in ('activo', 'pendiente', 'finalizado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sorteos_fechas_validas check (fecha_fin >= fecha_inicio)
);

create table if not exists public.participantes (
  id text primary key default gen_random_uuid()::text,
  sorteo_id text not null references public.sorteos(id) on delete cascade,
  nombres text not null,
  apellidos text not null,
  telefono text not null,
  ciudad text not null default 'Ayacucho',
  departamento text not null default 'Ayacucho',
  provincia text not null default 'Huamanga',
  distrito text not null default 'Ayacucho',
  fecha_nacimiento date not null,
  acepta_terminos boolean not null default false,
  estado text not null default 'activo' check (estado in ('activo', 'ganador', 'descalificado')),
  participacion_fecha date not null default current_date,
  respuestas jsonb not null default '{}'::jsonb,
  preguntas_snapshot jsonb not null default '[]'::jsonb,
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint participantes_acepta_terminos check (acepta_terminos = true),
  constraint participantes_telefono_valido check (telefono ~ '^[0-9]{9}$'),
  constraint participantes_una_vez_por_dia unique (telefono, participacion_fecha),
  constraint participantes_id_sorteo_unico unique (id, sorteo_id)
);

create table if not exists public.premios (
  id text primary key default gen_random_uuid()::text,
  sorteo_id text not null references public.sorteos(id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  valor numeric(10, 2) not null default 0 check (valor >= 0),
  imagen text not null default 'Premio',
  created_at timestamptz not null default now()
);

create table if not exists public.sorteo_preguntas (
  id uuid primary key default gen_random_uuid(),
  sorteo_id text not null references public.sorteos(id) on delete cascade,
  texto text not null,
  tipo text not null check (tipo in ('texto', 'seleccion_unica', 'seleccion_multiple')),
  opciones jsonb not null default '[]'::jsonb,
  requerida boolean not null default true,
  orden integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sorteo_preguntas_opciones_validas check (jsonb_typeof(opciones) = 'array')
);

create table if not exists public.ganadores (
  id text primary key default gen_random_uuid()::text,
  sorteo_id text not null references public.sorteos(id) on delete cascade,
  participante_id text not null references public.participantes(id) on delete restrict,
  premio_id text not null references public.premios(id) on delete restrict,
  notificado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ganadores_premio_unico unique (premio_id),
  constraint ganadores_participante_sorteo foreign key (participante_id, sorteo_id)
    references public.participantes(id, sorteo_id)
);

create table if not exists public.configuracion_restaurante (
  id smallint primary key default 1 check (id = 1),
  nombre text not null default 'Restaurante Las Flores',
  direccion text not null default '',
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  radio_metros integer not null default 150 check (radio_metros > 0),
  updated_at timestamptz not null default now()
);

create index if not exists participantes_sorteo_id_idx on public.participantes (sorteo_id);
create index if not exists participantes_telefono_idx on public.participantes (telefono);
create index if not exists participantes_created_at_idx on public.participantes (created_at desc);
create index if not exists premios_sorteo_id_idx on public.premios (sorteo_id);
create index if not exists ganadores_sorteo_id_idx on public.ganadores (sorteo_id);
create index if not exists sorteo_preguntas_sorteo_idx on public.sorteo_preguntas (sorteo_id, orden) where activa;

-- Extend existing installations without changing permanent raffle IDs or URLs.
alter table public.sorteos add column if not exists slug text;
alter table public.sorteos add column if not exists imagen_url text;
alter table public.sorteos add column if not exists premio_nombre text;
alter table public.sorteos add column if not exists premio_descripcion text;
alter table public.participantes add column if not exists respuestas jsonb not null default '{}'::jsonb;
alter table public.participantes add column if not exists preguntas_snapshot jsonb not null default '[]'::jsonb;
alter table public.participantes add column if not exists request_id uuid;
alter table public.participantes add column if not exists departamento text not null default 'Ayacucho';
alter table public.participantes add column if not exists provincia text not null default 'Huamanga';
alter table public.participantes add column if not exists distrito text not null default 'Ayacucho';

update public.sorteos
set slug = coalesce(nullif(slug, ''),
  trim(both '-' from regexp_replace(lower(nombre), '[^a-z0-9]+', '-', 'g')) || '-' || left(replace(id, '-', ''), 8))
where slug is null or slug = '';

alter table public.sorteos alter column slug set not null;
create unique index if not exists sorteos_slug_unique_idx on public.sorteos (slug);
create unique index if not exists participantes_request_id_unique_idx on public.participantes (request_id) where request_id is not null;

alter table public.sorteos
  add column if not exists tipo text not null default 'Experiencia gastronómica';

alter table public.participantes
  drop constraint if exists participantes_una_vez_por_dia;

alter table public.participantes
  drop constraint if exists participantes_sorteo_telefono_dia_unico;

alter table public.participantes
  add constraint participantes_sorteo_telefono_dia_unico unique (sorteo_id, telefono, participacion_fecha);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sorteos_set_updated_at on public.sorteos;
create trigger sorteos_set_updated_at
before update on public.sorteos
for each row execute function public.set_updated_at();

drop trigger if exists configuracion_set_updated_at on public.configuracion_restaurante;
create trigger configuracion_set_updated_at
before update on public.configuracion_restaurante
for each row execute function public.set_updated_at();

alter table public.sorteos enable row level security;
alter table public.participantes enable row level security;
alter table public.premios enable row level security;
alter table public.ganadores enable row level security;
alter table public.configuracion_restaurante enable row level security;
alter table public.sorteo_preguntas enable row level security;

-- Public users can see only published raffle and prize information.
drop policy if exists sorteos_public_select on public.sorteos;
create policy sorteos_public_select
on public.sorteos for select
to anon, authenticated
using (estado in ('activo', 'finalizado'));

drop policy if exists premios_public_select on public.premios;
create policy premios_public_select
on public.premios for select
to anon, authenticated
using (exists (
  select 1 from public.sorteos
  where sorteos.id = premios.sorteo_id
    and sorteos.estado in ('activo', 'finalizado')
));

-- Public participation is accepted only through the validated RPC below.
drop policy if exists participantes_public_insert on public.participantes;

drop policy if exists sorteo_preguntas_public_select on public.sorteo_preguntas;
create policy sorteo_preguntas_public_select
on public.sorteo_preguntas for select
to anon, authenticated
using (
  activa and exists (
    select 1 from public.sorteos
    where sorteos.id = sorteo_preguntas.sorteo_id
      and sorteos.estado in ('activo', 'finalizado')
  )
);

-- Administrative access requires Supabase Auth with app_metadata.role = 'admin'.
drop policy if exists sorteos_admin_all on public.sorteos;
create policy sorteos_admin_all
on public.sorteos for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists participantes_admin_select on public.participantes;
create policy participantes_admin_select
on public.participantes for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists participantes_admin_update on public.participantes;
create policy participantes_admin_update
on public.participantes for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists premios_admin_all on public.premios;
create policy premios_admin_all
on public.premios for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists sorteo_preguntas_admin_all on public.sorteo_preguntas;
create policy sorteo_preguntas_admin_all
on public.sorteo_preguntas for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists ganadores_admin_all on public.ganadores;
create policy ganadores_admin_all
on public.ganadores for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop function if exists public.registrar_participacion(text, text, text, text, text, date, boolean, jsonb, uuid);

create or replace function public.registrar_participacion(
  p_slug text,
  p_nombres text,
  p_apellidos text,
  p_telefono text,
  p_ciudad text,
  p_departamento text,
  p_provincia text,
  p_distrito text,
  p_fecha_nacimiento date,
  p_acepta_terminos boolean,
  p_respuestas jsonb,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sorteo public.sorteos%rowtype;
  v_pregunta public.sorteo_preguntas%rowtype;
  v_respuesta jsonb;
  v_snapshot jsonb;
  v_participante_id text;
begin
  if p_request_id is not null then
    select id into v_participante_id
    from public.participantes
    where request_id = p_request_id;
    if v_participante_id is not null then
      return jsonb_build_object('id', v_participante_id, 'duplicate', true);
    end if;
  end if;

  select * into v_sorteo
  from public.sorteos
  where slug = p_slug and estado = 'activo'
  for share;
  if not found then
    raise exception 'sorteo finalizado o no disponible' using errcode = 'P0001';
  end if;
  if current_date < v_sorteo.fecha_inicio then
    raise exception 'sorteo no está abierto' using errcode = 'P0001';
  end if;
  if current_date > v_sorteo.fecha_fin then
    raise exception 'sorteo finalizado' using errcode = 'P0001';
  end if;
  if coalesce(p_acepta_terminos, false) is not true then
    raise exception 'se requiere aceptar los términos' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nombres, ''))) < 2
    or length(trim(coalesce(p_apellidos, ''))) < 2
    or p_telefono !~ '^[0-9]{9}$'
    or length(trim(coalesce(p_ciudad, ''))) < 2
    or length(trim(coalesce(p_departamento, ''))) < 2
    or length(trim(coalesce(p_provincia, ''))) < 2
    or length(trim(coalesce(p_distrito, ''))) < 2
    or p_fecha_nacimiento is null
    or p_fecha_nacimiento > current_date then
    raise exception 'datos de participante inválidos' using errcode = '22023';
  end if;
  if p_respuestas is null or jsonb_typeof(p_respuestas) <> 'object' then
    raise exception 'formato de respuestas inválido' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_respuestas) as sent(key)
    where not exists (
      select 1 from public.sorteo_preguntas q
      where q.id::text = sent.key and q.sorteo_id = v_sorteo.id and q.activa
    )
  ) then
    raise exception 'la encuesta cambió; recarga la página' using errcode = '22023';
  end if;

  for v_pregunta in
    select * from public.sorteo_preguntas
    where sorteo_id = v_sorteo.id and activa
    order by orden
  loop
    v_respuesta := p_respuestas -> v_pregunta.id::text;
    if v_respuesta is null or v_respuesta = 'null'::jsonb then
      if v_pregunta.requerida then
        raise exception 'falta una respuesta obligatoria' using errcode = '22023';
      end if;
      continue;
    end if;

    if v_pregunta.tipo = 'texto' then
      if jsonb_typeof(v_respuesta) <> 'string'
        or (v_pregunta.requerida and length(trim(v_respuesta #>> '{}')) = 0) then
        raise exception 'respuesta de texto inválida' using errcode = '22023';
      end if;
    elsif v_pregunta.tipo = 'seleccion_unica' then
      if jsonb_typeof(v_respuesta) <> 'string'
        or not (v_pregunta.opciones @> jsonb_build_array(v_respuesta #>> '{}')) then
        raise exception 'opción de respuesta inválida' using errcode = '22023';
      end if;
    elsif v_pregunta.tipo = 'seleccion_multiple' then
      if jsonb_typeof(v_respuesta) <> 'array' then
        raise exception 'opciones de respuesta inválidas' using errcode = '22023';
      end if;
      if (v_pregunta.requerida and jsonb_array_length(v_respuesta) = 0)
        or exists (
          select 1 from jsonb_array_elements_text(v_respuesta) option(value)
          where not (v_pregunta.opciones @> jsonb_build_array(option.value))
        ) then
        raise exception 'opciones de respuesta inválidas' using errcode = '22023';
      end if;
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'texto', q.texto,
    'tipo', q.tipo,
    'respuesta', coalesce(p_respuestas -> q.id::text, 'null'::jsonb)
  ) order by q.orden), '[]'::jsonb)
  into v_snapshot
  from public.sorteo_preguntas q
  where q.sorteo_id = v_sorteo.id and q.activa;

  insert into public.participantes (
    sorteo_id, nombres, apellidos, telefono, ciudad, departamento, provincia, distrito, fecha_nacimiento,
    acepta_terminos, participacion_fecha, respuestas, preguntas_snapshot, request_id
  ) values (
    v_sorteo.id, trim(p_nombres), trim(p_apellidos), p_telefono, trim(p_ciudad),
    trim(p_departamento), trim(p_provincia), trim(p_distrito),
    p_fecha_nacimiento, true, current_date, p_respuestas, v_snapshot, p_request_id
  ) returning id into v_participante_id;

  return jsonb_build_object('id', v_participante_id, 'duplicate', false);
end;
$$;

revoke all on function public.registrar_participacion(text, text, text, text, text, text, text, text, date, boolean, jsonb, uuid) from public;
grant execute on function public.registrar_participacion(text, text, text, text, text, text, text, text, date, boolean, jsonb, uuid) to anon, authenticated;

drop policy if exists configuracion_admin_all on public.configuracion_restaurante;
create policy configuracion_admin_all
on public.configuracion_restaurante for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Initial restaurant configuration from the current application defaults.
insert into public.configuracion_restaurante (id, nombre, direccion, lat, lng, radio_metros)
values (1, 'Restaurante Las Flores', 'Ayacucho', -13.1631, -74.2236, 150)
on conflict (id) do nothing;

-- Retire the old sample raffles and their dependent sample records.
delete from public.sorteos
where id in ('s1', 's2')
  or lower(trim(nombre)) = 'celebremos lo nuestro';

insert into public.sorteos (id, slug, nombre, descripcion, tipo, fecha_inicio, fecha_fin, estado)
values
  ('s3', 'sorteo-navideno-s3', 'Sorteo Navideño', 'El gran sorteo de fin de año con los mejores premios.', 'Premios y productos', '2026-12-01', '2026-12-24', 'pendiente')
on conflict (id) do nothing;

insert into public.sorteos (
  id, slug, nombre, descripcion, tipo, fecha_inicio, fecha_fin, estado,
  premio_nombre, premio_descripcion
)
values (
  'demo-taxista-2026',
  'sorteo-taxista-ayacucho-demo',
  'Sorteo Taxista Ayacucho',
  'Sorteo de demostración para taxistas independientes y empresas de taxi de Ayacucho.',
  'Sorteo para taxistas',
  '2026-09-30',
  '2026-12-31',
  'activo',
  'Vale de combustible S/ 300',
  'Premio de demostración para el ganador del sorteo.'
)
on conflict (id) do nothing;

insert into public.sorteo_preguntas (id, sorteo_id, texto, tipo, opciones, requerida, orden)
values (
  'a1000000-0000-4000-8000-000000000001',
  'demo-taxista-2026',
  'Selecciona tu modalidad o empresa de taxi',
  'seleccion_unica',
  '["Independiente", "TAXI MARTINEZ AYACUCHO", "Taxi Super Vip Ayacucho", "TAXI AYACUCHO EXPRESS", "Taxi Central Huamanga 24 hrs", "TU TAXI SEGURO AYACUCHO 24 HRS", "TAXI AYACUCHO", "Taxi Venticuatro Horas Ayacucho", "TAXI MARTINEZ AYACUCHO 24 HORAS", "TAXI CENTRAL HUAMANGA", "Taxi Huamanga", "Peru Taxi Aplicativo", "Taxi Carga Ayacucho (Huamanga)", "Siwar Tour - Servicio de Taxi en Ayacucho", "Taxi Moda Vip", "IDCARS - AYACUCHO"]'::jsonb,
  true,
  0
)
on conflict (id) do nothing;
