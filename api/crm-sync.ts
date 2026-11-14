/**
 * Envía al CRM los participantes pendientes de la bandeja `crm_envios`.
 *
 * - POST: lo llama el formulario público justo después de registrar a alguien (sin esperar respuesta).
 * - GET: lo llama el cron diario de Vercel para reintentar lo que haya quedado pendiente.
 *
 * Contrato: integracion-crm/INDICACIONES-CRM.md. Variables solo de servidor:
 * SUPABASE_SERVICE_ROLE_KEY, CRM_WEBHOOK_SECRET (y opcional CRON_SECRET).
 */

const CRM_URL = 'https://crm-grupo-las-flores.vercel.app/api/clientes/webhook-sorteo';
const BATCH = 10;
/** Espera antes de cada reintento (1 min, 5 min, 30 min, 2 h, 12 h); después, revisión manual. */
const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
/** Nuestros distritos que el CRM escribe distinto. */
const DISTRITOS_CRM: Record<string, string> = {
  'Andrés Avelino Cáceres Dorregaray': 'Andrés Avelino Cáceres',
};

type Fila = {
  participante_id: string;
  intentos: number;
  participantes: {
    nombres: string;
    apellidos: string;
    telefono: string;
    fecha_nacimiento: string;
    departamento: string;
    provincia: string;
    distrito: string;
    created_at: string;
    request_id: string | null;
    sorteos: { slug: string | null; nombre: string; negocio: string | null } | null;
  } | null;
};

type Resultado = { estado: 'enviado' | 'rechazado' | 'revision' | 'pendiente'; detalle?: string };

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function supabaseConfig() {
  return { url: process.env.SUPABASE_URL?.trim() || env('VITE_SUPABASE_URL'), key: env('SUPABASE_SERVICE_ROLE_KEY') };
}

async function rest(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response;
}

function actualizar(id: string, cambios: Record<string, unknown>) {
  return rest(`crm_envios?participante_id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
    headers: { Prefer: 'return=minimal' },
  });
}

function cuerpo(fila: Fila) {
  const p = fila.participantes!;
  const sorteo = p.sorteos!;
  return {
    negocio: sorteo.negocio,
    sorteo_slug: sorteo.slug,
    sorteo_nombre: sorteo.nombre,
    nombres: p.nombres,
    apellidos: p.apellidos,
    telefono: p.telefono,
    fecha_nacimiento: p.fecha_nacimiento,
    departamento: p.departamento || undefined,
    provincia: p.provincia || undefined,
    distrito: DISTRITOS_CRM[p.distrito] ?? (p.distrito || undefined),
    // Participar implica aceptar el aviso del formulario, que incluye promociones y saludos por WhatsApp.
    acepta_comunicaciones: true,
    created_at: p.created_at,
    request_id: p.request_id ?? fila.participante_id,
  };
}

async function enviar(fila: Fila, secreto: string): Promise<Resultado> {
  if (!fila.participantes?.sorteos?.slug) return { estado: 'revision', detalle: 'El participante o su sorteo no tiene datos completos (slug).' };
  const negocio = fila.participantes.sorteos.negocio;
  if (negocio !== 'las-flores' && negocio !== 'umaru') return { estado: 'revision', detalle: 'El sorteo no tiene negocio definido (sorteos.negocio).' };
  let response: Response;
  try {
    response = await fetch(CRM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secreto}` },
      body: JSON.stringify(cuerpo(fila)),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { estado: 'pendiente', detalle: `Sin respuesta del CRM: ${(error as Error).message}` };
  }
  const data = (await response.json().catch(() => ({}))) as { resultado?: string; error?: string; campo?: string };
  if (response.ok) return { estado: 'enviado', detalle: data.resultado ?? 'creado' };
  const motivo = `${response.status}: ${data.error ?? 'sin detalle'}${data.campo ? ` (campo ${data.campo})` : ''}`;
  if (response.status === 401) throw new Error(`El CRM rechazó el secreto (${motivo}). Revisa CRM_WEBHOOK_SECRET.`);
  if (response.status >= 400 && response.status < 500) return { estado: 'rechazado', detalle: motivo };
  return { estado: 'pendiente', detalle: motivo };
}

async function procesar() {
  const secreto = env('CRM_WEBHOOK_SECRET');
  const ahora = new Date();
  const seleccion = 'participante_id,intentos,participantes(nombres,apellidos,telefono,fecha_nacimiento,departamento,provincia,distrito,created_at,request_id,sorteos(slug,nombre,negocio))';
  const filas = (await (
    await rest(`crm_envios?select=${seleccion}&estado=eq.pendiente&proximo_intento=lte.${ahora.toISOString()}&order=proximo_intento&limit=${BATCH}`)
  ).json()) as Fila[];

  // Las reserva unos minutos para que dos llamadas simultáneas no las envíen a la vez.
  if (filas.length) {
    const ids = filas.map((f) => `"${f.participante_id}"`).join(',');
    await rest(`crm_envios?participante_id=in.(${ids})&estado=eq.pendiente`, {
      method: 'PATCH',
      body: JSON.stringify({ proximo_intento: new Date(ahora.getTime() + 5 * 60_000).toISOString() }),
      headers: { Prefer: 'return=minimal' },
    });
  }

  const resumen = { enviados: 0, rechazados: 0, reintentar: 0, revision: 0 };
  for (const fila of filas) {
    let resultado: Resultado;
    try {
      resultado = await enviar(fila, secreto);
    } catch (error) {
      // 401: problema de configuración. Se deja pendiente sin gastar intentos y se detiene el lote.
      await actualizar(fila.participante_id, { ultimo_error: (error as Error).message, proximo_intento: new Date(Date.now() + 30 * 60_000).toISOString() });
      throw error;
    }
    const intentos = fila.intentos + 1;
    if (resultado.estado === 'enviado') {
      await actualizar(fila.participante_id, { estado: 'enviado', resultado: resultado.detalle, intentos, ultimo_error: null, enviado_at: new Date().toISOString() });
      resumen.enviados += 1;
    } else if (resultado.estado === 'rechazado' || resultado.estado === 'revision') {
      await actualizar(fila.participante_id, { estado: resultado.estado, intentos, ultimo_error: resultado.detalle });
      resumen[resultado.estado === 'rechazado' ? 'rechazados' : 'revision'] += 1;
    } else if (intentos > BACKOFF_MS.length) {
      await actualizar(fila.participante_id, { estado: 'revision', intentos, ultimo_error: resultado.detalle });
      resumen.revision += 1;
    } else {
      const proximo = new Date(Date.now() + BACKOFF_MS[intentos - 1]).toISOString();
      await actualizar(fila.participante_id, { intentos, ultimo_error: resultado.detalle, proximo_intento: proximo });
      resumen.reintentar += 1;
    }
  }
  return { procesados: filas.length, ...resumen };
}

async function responder() {
  try {
    return Response.json({ ok: true, ...(await procesar()) });
  } catch (error) {
    console.error('[crm-sync]', error);
    return Response.json({ ok: false, error: `No se pudo sincronizar con el CRM: ${(error as Error).message}` }, { status: 500 });
  }
}

/** Cron de Vercel. Si CRON_SECRET está definido, Vercel lo envía y aquí se exige. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }
  return responder();
}

/** Lo llama el navegador tras registrar a alguien; solo vacía la bandeja, no recibe datos. */
export async function POST() {
  return responder();
}
