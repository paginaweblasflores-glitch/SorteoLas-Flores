-- Add the "Otros" option to the existing taxi raffle question and accept its comment.
begin;

update public.sorteo_preguntas
set opciones = opciones || jsonb_build_array('Otros')
where id = 'a1000000-0000-4000-8000-000000000001'
  and sorteo_id = 'demo-taxista-2026'
  and not (opciones @> '["Otros"]'::jsonb);

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
    or (p_ciudad = 'Ayacucho' and (
      length(trim(coalesce(p_departamento, ''))) < 2
      or length(trim(coalesce(p_provincia, ''))) < 2
      or length(trim(coalesce(p_distrito, ''))) < 2
    ))
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

commit;
