-- Negocio de cada sorteo para el CRM ('las-flores' | 'umaru'), guardado aparte del logo.
-- El panel lo llena al elegir la marca. Ejecutar una vez en el SQL Editor de Supabase
-- ANTES de desplegar la versión que lo usa.

alter table public.sorteos
  add column if not exists negocio text
  check (negocio in ('las-flores', 'umaru'));

-- Rellena los sorteos existentes según la marca elegida hoy.
update public.sorteos
set negocio = case
  when lower(coalesce(imagen_url, '')) like '%flores%' then 'las-flores'
  when lower(coalesce(imagen_url, '')) like '%umaru%' then 'umaru'
end
where negocio is null;

-- Revisión: debe salir cada sorteo con su negocio (ninguno vacío).
select slug, nombre, imagen_url, negocio from public.sorteos order by created_at;
