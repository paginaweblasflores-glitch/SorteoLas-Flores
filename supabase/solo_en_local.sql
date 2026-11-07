-- Sorteos "solo en el local": solo pueden participar personas que estén cerca del negocio.
--
-- Cómo aplicarlo: Supabase → SQL Editor → pegar este archivo completo → Run.
-- Es compatible con la versión publicada del sitio: los nuevos datos de ubicación son opcionales.
--
-- Funcionamiento:
--   * Cada sorteo tiene la opción `solo_en_local` (por defecto desactivada).
--   * Las coordenadas y el radio de cada negocio se configuran en el panel
--     (Ubicaciones → Datos de los negocios) y se guardan en configuracion_codigos_qr.
--   * Si el negocio todavía no tiene coordenadas, no se bloquea a nadie.
begin;

alter table public.sorteos add column if not exists solo_en_local boolean not null default false;

drop function if exists public.registrar_participacion(text, text, text, text, text, text, text, date, boolean, jsonb, uuid);

create function public.registrar_participacion(
  p_slug text,
  p_nombres text,
  p_apellidos text,
  p_telefono text,
  p_departamento text,
  p_provincia text,
  p_distrito text,
  p_fecha_nacimiento date,
  p_acepta_terminos boolean,
  p_respuestas jsonb,
  p_request_id uuid,
  p_lat double precision default null,
  p_lng double precision default null,
  p_precision double precision default null
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
  v_marca text;
  v_negocio jsonb;
  v_lat double precision;
  v_lng double precision;
  v_radio double precision;
  v_distancia double precision;
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
    or length(trim(coalesce(p_departamento, ''))) < 2
    or length(trim(coalesce(p_provincia, ''))) < 2
    or length(trim(coalesce(p_distrito, ''))) < 2
    or p_fecha_nacimiento is null
    or p_fecha_nacimiento > current_date then
    raise exception 'datos de participante inválidos' using errcode = '22023';
  end if;
  -- Sorteos "solo en el local": el participante debe estar dentro del radio del negocio.
  if coalesce(v_sorteo.solo_en_local, false) then
    v_marca := case when coalesce(v_sorteo.imagen_url, '') ilike '%umaru%' then 'umaru' else 'flores' end;
    select n into v_negocio
    from public.configuracion_codigos_qr c, jsonb_array_elements(c.negocios) n
    where c.id = 1
      and (
        n->>'brand' = v_marca
        or (n->>'brand' is null and ((coalesce(n->>'name', '') ilike '%umaru%') = (v_marca = 'umaru')))
      )
    limit 1;

    if coalesce(v_negocio->>'lat', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and coalesce(v_negocio->>'lng', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then
      v_lat := (v_negocio->>'lat')::double precision;
      v_lng := (v_negocio->>'lng')::double precision;
      v_radio := case
        when coalesce(v_negocio->>'radius', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_negocio->>'radius')::double precision
        else 300
      end;

      if p_lat is null or p_lng is null then
        raise exception 'se requiere la ubicación' using errcode = 'P0001';
      end if;

      -- Distancia en metros (fórmula de haversine).
      v_distancia := 2 * 6371000 * asin(sqrt(
        power(sin(radians(p_lat - v_lat) / 2), 2)
        + cos(radians(v_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_lng) / 2), 2)
      ));

      -- Se descuenta el margen de error del GPS del celular (hasta 150 m).
      if v_distancia - least(greatest(coalesce(p_precision, 0), 0), 150) > v_radio then
        raise exception 'fuera del local' using errcode = 'P0001';
      end if;
    end if;
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
        or not (
          v_pregunta.opciones @> jsonb_build_array(v_respuesta #>> '{}')
          or (
            v_pregunta.opciones @> '["Otros"]'::jsonb
            and (v_respuesta #>> '{}') like 'Otros: %'
            and length(trim(substr(v_respuesta #>> '{}', 8))) > 0
          )
        ) then
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
    sorteo_id, nombres, apellidos, telefono, departamento, provincia, distrito, fecha_nacimiento,
    acepta_terminos, participacion_fecha, respuestas, preguntas_snapshot, request_id
  ) values (
    v_sorteo.id, trim(p_nombres), trim(p_apellidos), p_telefono,
    trim(p_departamento), trim(p_provincia), trim(p_distrito),
    p_fecha_nacimiento, true, current_date, p_respuestas, v_snapshot, p_request_id
  ) returning id into v_participante_id;

  return jsonb_build_object('id', v_participante_id, 'duplicate', false);
end;
$$;

revoke all on function public.registrar_participacion(text, text, text, text, text, text, text, date, boolean, jsonb, uuid, double precision, double precision, double precision) from public;
grant execute on function public.registrar_participacion(text, text, text, text, text, text, text, date, boolean, jsonb, uuid, double precision, double precision, double precision) to anon, authenticated;

commit;
