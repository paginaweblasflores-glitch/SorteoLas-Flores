const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Define SUPABASE_URL y SUPABASE_ANON_KEY antes de ejecutar el script.');
}

const projectUrl = new URL(supabaseUrl);
if (projectUrl.protocol !== 'https:') {
  throw new Error('SUPABASE_URL debe usar HTTPS.');
}

const queryUrl = new URL('/rest/v1/sorteos?select=id&limit=1', projectUrl);

try {
  const response = await fetch(queryUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase respondió HTTP ${response.status}: ${details}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error('Supabase devolvió una respuesta inesperada al consultar sorteos.');
  }

  console.log(`Consulta a Supabase completada correctamente (${rows.length} fila(s)).`);
} catch (error) {
  console.error('No se pudo completar la consulta de mantenimiento:', error);
  process.exitCode = 1;
}
