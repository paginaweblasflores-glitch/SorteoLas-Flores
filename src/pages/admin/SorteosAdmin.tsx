import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BRANDS, brandOf } from '../../assets/raffleLogos';
import { TEMPLATE_OPTIONS, templateIdFor } from '../../templates/registry';
import type { Sorteo } from '../../data/mockData';
import { compressImageToWebp } from '../../lib/compressImage';
import { hasCoordinates, loadBusinesses, type Business } from '../../lib/businesses';
import { supabase } from '../../lib/supabase';
import AdminParticipantes from './Participantes';

type QuestionDraft = {
  id: string;
  texto: string;
  tipo: 'texto' | 'seleccion_unica' | 'seleccion_multiple';
  opciones: string[];
  requerida: boolean;
};

type AdminSorteo = Sorteo & {
  slug: string;
  imagen_url: string | null;
  fondo_url: string | null;
  premio_nombre: string | null;
  solo_en_local: boolean;
};

const configuredPublicUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const PUBLIC_BASE_URL = (configuredPublicUrl || (isLocalHost ? '' : window.location.origin)).replace(/\/+$/, '');
const EMPTY_FORM = {
  nombre: '', descripcion: '', tipo: 'clasica' as string, fechaInicio: '', fechaFin: '',
  premioNombre: '', imagenUrl: '', fondoUrl: '', estado: 'pendiente' as AdminSorteo['estado'], soloEnLocal: false,
};
const BACKGROUND_BUCKET = 'raffle-backgrounds';
const MAX_BACKGROUND_SIZE = 20 * 1024 * 1024;
const STATUS_LABEL: Record<AdminSorteo['estado'], string> = { activo: 'Publicado', pendiente: 'Borrador', finalizado: 'Finalizado' };

function publicUrl(slug: string) {
  return `${PUBLIC_BASE_URL}/sorteo/${encodeURIComponent(slug)}`;
}

function makeSlug(name: string) {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sorteo';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function mapRaffle(row: any): AdminSorteo {
  const count = (value: unknown) => Array.isArray(value) ? Number((value[0] as { count?: number } | undefined)?.count ?? 0) : 0;
  return {
    id: row.id, slug: row.slug, nombre: row.nombre, descripcion: row.descripcion ?? '', tipo: row.tipo ?? '',
    fechaInicio: row.fecha_inicio, fechaFin: row.fecha_fin, estado: row.estado,
    participantes: count(row.participantes), premios: row.premio_nombre ? 1 : 0,
    imagen_url: row.imagen_url, fondo_url: row.fondo_url, premio_nombre: row.premio_nombre, solo_en_local: Boolean(row.solo_en_local),
  };
}

const RAFFLE_BASE = 'id,slug,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,imagen_url,premio_nombre,participantes(count)';

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204'));
}

/** Lee los sorteos; si falta alguna columna nueva en Supabase, reintenta sin ella y avisa. */
async function fetchRaffles() {
  const attempts: Array<{ extra: string; warning: string }> = [
    { extra: ',fondo_url,solo_en_local', warning: '' },
    { extra: ',fondo_url', warning: 'Falta ejecutar la migración supabase/solo_en_local.sql: la opción «solo en el local» no se guardará hasta aplicarla.' },
    { extra: '', warning: 'Faltan columnas nuevas en Supabase (fondo_url y solo_en_local). Ejecuta las migraciones pendientes.' },
  ];
  let lastError: { code?: string; message: string } | null = null;
  for (const attempt of attempts) {
    const { data, error } = await supabase!.from('sorteos').select(RAFFLE_BASE + attempt.extra).order('created_at', { ascending: false });
    if (!error) return { data: (data ?? []) as any[], error: null, warning: attempt.warning, hasSoloEnLocal: attempt.extra.includes('solo_en_local') };
    lastError = error;
    if (!isMissingColumn(error)) break;
  }
  return { data: null, error: lastError, warning: '', hasSoloEnLocal: false };
}


export default function SorteosAdmin({ mode = 'list', initialSelectedId = null, onOpenRaffle }: {
  /** "create": solo el formulario para crear un sorteo. "list": lista y detalle de sorteos. */
  mode?: 'list' | 'create';
  initialSelectedId?: string | null;
  onOpenRaffle?: (raffleId: string) => void;
} = {}) {
  const [sorteos, setSorteos] = useState<AdminSorteo[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<string[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [backgroundOriginalSize, setBackgroundOriginalSize] = useState<number | null>(null);
  const [compressingBackground, setCompressingBackground] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(mode === 'create');
  const [created, setCreated] = useState<{ id: string; nombre: string; estado: AdminSorteo['estado'] } | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schemaWarning, setSchemaWarning] = useState('');
  const [qrRaffle, setQrRaffle] = useState<AdminSorteo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSorteo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [soloEnLocalAvailable, setSoloEnLocalAvailable] = useState(true);
  const [detailView, setDetailView] = useState<'resumen' | 'participantes'>('resumen');
  const [filter, setFilter] = useState<'todos' | AdminSorteo['estado']>('todos');
  const [qrImage, setQrImage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    if (backgroundPreview.startsWith('blob:')) URL.revokeObjectURL(backgroundPreview);
  }, [backgroundPreview]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const fetched = await fetchRaffles();
      const data = fetched.data;
      const loadError = fetched.error;
      setSchemaWarning(fetched.warning);
      setSoloEnLocalAvailable(fetched.hasSoloEnLocal);
      if (cancelled) return;
      if (loadError) {
        setError(`No se pudieron cargar sorteos. Error ${loadError.code || 'desconocido'}: ${loadError.message}`);
      }
      else setSorteos((data ?? []).map(mapRaffle));
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!qrRaffle || !PUBLIC_BASE_URL) { setQrImage(''); return; }
    void QRCode.toDataURL(publicUrl(qrRaffle.slug), { width: 360, margin: 2, errorCorrectionLevel: 'H' })
      .then((image) => { if (!cancelled) setQrImage(image); })
      .catch(() => { if (!cancelled) setError('No se pudo generar el código QR.'); });
    return () => { cancelled = true; };
  }, [qrRaffle]);

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBackgroundFile(null);
    setBackgroundPreview('');
    setBackgroundOriginalSize(null);
    setQuestions([]);
    setOriginalQuestionIds([]);
  }

  async function selectBackground(file: File | null) {
    if (!file) {
      setBackgroundFile(null);
      setBackgroundPreview('');
      setBackgroundOriginalSize(null);
      setForm((previous) => ({ ...previous, fondoUrl: '' }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.');
      return;
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      setError('La imagen original no puede superar los 20 MB.');
      return;
    }
    setError('');
    setCompressingBackground(true);
    try {
      const compressedFile = await compressImageToWebp(file);
      setBackgroundFile(compressedFile);
      setBackgroundOriginalSize(file.size);
      setBackgroundPreview(URL.createObjectURL(compressedFile));
    } catch (compressionError) {
      setError(compressionError instanceof Error ? compressionError.message : 'No se pudo comprimir la imagen.');
    } finally {
      setCompressingBackground(false);
    }
  }

  function addQuestion() {
    setQuestions((current) => [...current, { id: crypto.randomUUID(), texto: '', tipo: 'texto', opciones: [], requerida: true }]);
  }

  async function editRaffle(raffle: AdminSorteo) {
    if (!supabase) return;
    setError('');
    setEditingId(raffle.id);
    setForm({ nombre: raffle.nombre, descripcion: raffle.descripcion, tipo: templateIdFor(raffle), fechaInicio: raffle.fechaInicio, fechaFin: raffle.fechaFin, premioNombre: raffle.premio_nombre ?? '', imagenUrl: brandOf(raffle.imagen_url)?.key ?? '', fondoUrl: raffle.fondo_url ?? '', estado: raffle.estado, soloEnLocal: raffle.solo_en_local });
    setBackgroundFile(null);
    setBackgroundPreview(raffle.fondo_url ?? '');
    setQuestions([]);
    setOriginalQuestionIds([]);
    setShowForm(true);

    const { data, error: questionError } = await supabase.from('sorteo_preguntas')
      .select('id,texto,tipo,opciones,requerida').eq('sorteo_id', raffle.id).eq('activa', true).order('orden');
    if (questionError) { setError('Se abrió el editor, pero no se pudieron cargar las preguntas. Puedes editar los datos del sorteo y volver a intentarlo.'); return; }
    const loadedQuestions = (data ?? []) as QuestionDraft[];
    setOriginalQuestionIds(loadedQuestions.map((item) => item.id));
    setQuestions(loadedQuestions);
  }

  async function saveRaffle() {
    const isNew = !editingId;
    if (!supabase || !form.nombre.trim() || !form.fechaInicio || !form.fechaFin || form.fechaFin < form.fechaInicio) {
      setError('Completa el título y las fechas; el cierre no puede ser anterior al inicio.');
      return;
    }
    if (!brandOf(form.imagenUrl)) {
      setError('Elige si el sorteo es de Umaru o de Las Flores.');
      return;
    }
    if (questions.some((question) => !question.texto.trim() || (question.tipo !== 'texto' && question.opciones.filter(Boolean).length < 2))) {
      setError('Cada pregunta debe tener texto y las preguntas de selección deben tener al menos dos opciones.');
      return;
    }
    setSaving(true);
    setError('');
    const selectedLogo = brandOf(form.imagenUrl)!.key;
    const payload = {
      nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), tipo: form.tipo,
      fecha_inicio: form.fechaInicio, fecha_fin: form.fechaFin, estado: form.estado,
      premio_nombre: form.premioNombre.trim() || null,
      imagen_url: selectedLogo,
      ...(form.fondoUrl ? { fondo_url: form.fondoUrl } : {}),
      ...(soloEnLocalAvailable ? { solo_en_local: form.soloEnLocal } : {}),
      premio_descripcion: null,
    };
    const draftPayload = { ...payload, estado: 'pendiente' as const };
    const newSlug = editingId ? null : makeSlug(form.nombre);
    const result = editingId
      ? await supabase.from('sorteos').update(draftPayload).eq('id', editingId).select('id').single()
      : await supabase.from('sorteos').insert({ ...draftPayload, slug: newSlug }).select('id').single();
    if (result.error || !result.data) {
      setSaving(false);
      setError(result.error?.code === '23505' ? 'Ese enlace ya existe. Cambia el título e inténtalo nuevamente.' : 'No se pudo guardar el sorteo. Verifica los permisos y la configuración de Supabase.');
      return;
    }
    const raffleId = result.data.id as string;
    if (newSlug) {
      setSorteos((current) => [{
        id: raffleId,
        slug: newSlug,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        tipo: form.tipo,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        estado: 'pendiente',
        participantes: 0,
        premios: form.premioNombre.trim() ? 1 : 0,
        imagen_url: selectedLogo,
        fondo_url: form.fondoUrl || null,
        premio_nombre: form.premioNombre.trim() || null,
        solo_en_local: form.soloEnLocal,
      }, ...current]);
    }
    if (backgroundFile) {
      const path = `${raffleId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from(BACKGROUND_BUCKET).upload(path, backgroundFile, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: false,
      });
      if (uploadError) {
        setEditingId(raffleId);
        setSaving(false);
        setError('El sorteo se guardó, pero no se pudo subir el fondo. Verifica que el bucket raffle-backgrounds esté configurado en Supabase.');
        return;
      }
      const backgroundUrl = supabase.storage.from(BACKGROUND_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error: imageSaveError } = await supabase.from('sorteos').update({ fondo_url: backgroundUrl }).eq('id', raffleId);
      if (imageSaveError) {
        setEditingId(raffleId);
        setSaving(false);
        setError('La imagen se subió, pero no se pudo asociar al sorteo. Verifica la columna fondo_url en Supabase y vuelve a guardar.');
        return;
      }
      setForm((previous) => ({ ...previous, fondoUrl: backgroundUrl }));
      setBackgroundFile(null);
      setBackgroundPreview(backgroundUrl);
    }
    const activeQuestionIds = questions.map((item) => item.id);
    const questionPayload = questions.map((question, index) => ({
      id: question.id, sorteo_id: raffleId, texto: question.texto.trim(), tipo: question.tipo,
      opciones: question.tipo === 'texto' ? [] : question.opciones.map((option) => option.trim()).filter(Boolean),
      requerida: question.requerida, orden: index, activa: true,
    }));
    const questionSave = questionPayload.length ? await supabase.from('sorteo_preguntas').upsert(questionPayload) : { error: null };
    const removedIds = originalQuestionIds.filter((id) => !activeQuestionIds.includes(id));
    const deactivation = removedIds.length ? await supabase.from('sorteo_preguntas').update({ activa: false }).in('id', removedIds) : { error: null };
    if (questionSave.error || deactivation.error) {
      setEditingId(raffleId);
      setSaving(false);
      setError('El sorteo se guardó, pero no se pudieron guardar todas las preguntas. Corrige el problema y vuelve a guardar este formulario.');
      return;
    }
    const { error: statusError } = await supabase.from('sorteos').update({ estado: form.estado }).eq('id', raffleId);
    if (statusError) {
      setEditingId(raffleId);
      setSaving(false);
      setError('El contenido está guardado como borrador, pero no se pudo aplicar el estado elegido. Vuelve a guardar el formulario.');
      return;
    }
    const fetched = await fetchRaffles();
    const data = fetched.data;
    const reloadError = fetched.error;
    setSchemaWarning(fetched.warning);
    setSoloEnLocalAvailable(fetched.hasSoloEnLocal);
    if (!reloadError) setSorteos((data ?? []).map(mapRaffle));
    setSaving(false);
    if (isNew && mode === 'create') setCreated({ id: raffleId, nombre: form.nombre.trim(), estado: form.estado });
    closeForm();
  }

  async function updateStatus(raffle: AdminSorteo, status: AdminSorteo['estado']) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('sorteos').update({ estado: status }).eq('id', raffle.id);
    if (updateError) { setError('No se pudo actualizar el estado del sorteo.'); return; }
    setSorteos((current) => current.map((item) => item.id === raffle.id ? { ...item, estado: status } : item));
  }

  async function deleteRaffle(raffle: AdminSorteo) {
    if (!supabase) return;
    setDeleting(true);
    setError('');
    // Borra el sorteo; sus participantes y preguntas se eliminan en cascada en la base de datos.
    const { error: deleteError } = await supabase.from('sorteos').delete().eq('id', raffle.id);
    if (deleteError) {
      setDeleting(false);
      setError('No se pudo eliminar el sorteo. Verifica tu sesión de administrador e inténtalo nuevamente.');
      return;
    }
    // La imagen de fondo subida para este sorteo ya no se usa: se intenta borrar (si falla, no bloquea).
    const marker = `/object/public/${BACKGROUND_BUCKET}/`;
    const backgroundPath = raffle.fondo_url?.includes(marker) ? decodeURIComponent(raffle.fondo_url.split(marker)[1].split('?')[0]) : '';
    if (backgroundPath) await supabase.storage.from(BACKGROUND_BUCKET).remove([backgroundPath]);
    setSorteos((current) => current.filter((item) => item.id !== raffle.id));
    if (editingId === raffle.id) closeForm();
    if (selectedId === raffle.id) setSelectedId(null);
    setDeleting(false);
    setDeleteTarget(null);
  }


  async function copyLink(raffle: AdminSorteo) {
    if (!PUBLIC_BASE_URL) {
      setError('Configura VITE_PUBLIC_SITE_URL para copiar una URL pública completa.');
      return;
    }
    await navigator.clipboard.writeText(publicUrl(raffle.slug));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const selected = sorteos.find((item) => item.id === selectedId) ?? null;
  const counts = {
    todos: sorteos.length,
    activo: sorteos.filter((item) => item.estado === 'activo').length,
    pendiente: sorteos.filter((item) => item.estado === 'pendiente').length,
    finalizado: sorteos.filter((item) => item.estado === 'finalizado').length,
  };
  const visible = filter === 'todos' ? sorteos : sorteos.filter((item) => item.estado === filter);
  const editorProps = {
    form, setForm, questions, setQuestions, backgroundPreview,
    onBackgroundFile: (file: File | undefined) => { if (file) void selectBackground(file); },
    onClearBackground: () => { void selectBackground(null); },
    backgroundOriginalSize, compressedBackgroundSize: backgroundFile?.size ?? null, compressingBackground,
    onAddQuestion: addQuestion, saving, onSave: () => { void saveRaffle(); }, onCancel: closeForm,
  };

  function startNew() {
    closeForm();
    setCreated(null);
    setError('');
    setShowForm(true);
  }

  if (mode === 'create') {
    return <div className="space-y-6 animate-fade-in">
      {error && <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-brand-error)' }}>{error}</p>}
      {!supabase && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-card)', color: 'var(--color-admin-muted)' }}>Configura Supabase para crear sorteos.</p>}
      {created ? (
        <section className="rounded-2xl border p-6 text-center sm:p-8" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }} role="status">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--color-admin-success-bg)', color: 'var(--color-admin-success)' }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold" style={{ color: 'var(--color-admin-text)' }}>Sorteo creado</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>«{created.nombre}» quedó guardado como <strong style={{ color: 'var(--color-admin-text)' }}>{STATUS_LABEL[created.estado]}</strong>.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onOpenRaffle && <button type="button" onClick={() => onOpenRaffle(created.id)} className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>Ver sorteo</button>}
            <button type="button" onClick={startNew} className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Crear otro sorteo</button>
          </div>
        </section>
      ) : (
        <SorteoEditor {...editorProps} editing={false} onCancel={startNew} />
      )}
    </div>;
  }

  function openRaffle(raffle: AdminSorteo) {
    closeForm();
    setError('');
    setSelectedId(raffle.id);
    setDetailView('resumen');
  }

  return <div className="space-y-6 animate-fade-in">
    {error && <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-brand-error)' }}>{error}</p>}
    {schemaWarning && <p role="status" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-primary-bg)', color: 'var(--color-brand-gold-dim)' }}>{schemaWarning}</p>}
    {!supabase && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-card)', color: 'var(--color-admin-muted)' }}>Configura Supabase para administrar sorteos y participantes. No se guardan datos de demostración.</p>}

    {selected && detailView === 'participantes' ? (
      /* ── Participantes del sorteo ───────────────────────── */
      <div className="space-y-5">
        <button type="button" onClick={() => setDetailView('resumen')} className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-admin-muted)' }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          {selected.nombre}
        </button>
        <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-admin-text)' }}>Participantes</h2>
        <AdminParticipantes sorteoId={selected.id} />
      </div>
    ) : selected ? (
      /* ── Detalle del sorteo ─────────────────────────────── */
      <div className="space-y-5">
        <button type="button" onClick={() => { closeForm(); setSelectedId(null); }} className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-admin-muted)' }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          Todos los sorteos
        </button>

        <header className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start sm:justify-between" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge estado={selected.estado} />
              <BrandChip imagenUrl={selected.imagen_url} />
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight" style={{ color: 'var(--color-admin-text)' }}>{selected.nombre}</h2>
            {selected.descripcion && <p className="mt-1.5 max-w-2xl text-sm" style={{ color: 'var(--color-admin-muted)' }}>{selected.descripcion}</p>}
          </div>
          {!(showForm && editingId === selected.id) && (
            <button type="button" onClick={() => void editRaffle(selected)} className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>Editar sorteo</button>
          )}
        </header>

        {showForm && editingId === selected.id ? <SorteoEditor {...editorProps} editing /> : <>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Compartir</h3>
              <p className="mt-3 break-all rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', color: 'var(--color-admin-text)' }}>{publicUrl(selected.slug)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void copyLink(selected)} disabled={!PUBLIC_BASE_URL} className="admin-action disabled:opacity-50">{copied ? 'Copiado' : 'Copiar enlace'}</button>
                <button onClick={() => setQrRaffle(selected)} className="admin-action">Ver QR</button>
                <a href={publicUrl(selected.slug)} target="_blank" rel="noreferrer" className="admin-action">Abrir encuesta</a>
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Resumen</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Participantes</dt><dd className="tabular mt-0.5 text-xl font-semibold" style={{ color: 'var(--color-admin-text)' }}>{selected.participantes}</dd></div>
                <div><dt className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Vigencia</dt><dd className="mt-0.5" style={{ color: 'var(--color-admin-text)' }}>{shortRange(selected.fechaInicio, selected.fechaFin)}</dd></div>
                {selected.premio_nombre && <div className="col-span-2"><dt className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Premio</dt><dd className="mt-0.5 whitespace-pre-line" style={{ color: 'var(--color-admin-text)' }}>{selected.premio_nombre}</dd></div>}
              </dl>
            </section>
          </div>

          <button type="button" onClick={() => setDetailView('participantes')} className="raffle-row flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>Participantes</span>
              <span className="mt-0.5 block text-sm" style={{ color: 'var(--color-admin-muted)' }}>{selected.participantes === 0 ? 'Todavía no hay inscritos.' : `${selected.participantes} ${selected.participantes === 1 ? 'persona inscrita' : 'personas inscritas'} · ver lista, respuestas y copiar nombres`}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-brand-gold-dim)' }}>Ver participantes
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </span>
          </button>

          <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-admin-danger-border)', background: 'var(--color-admin-card)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-danger)' }}>Zona de cuidado</h3>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Estado del sorteo
                <select value={selected.estado} onChange={(event) => void updateStatus(selected, event.target.value as AdminSorteo['estado'])} className="mt-1.5 block w-56 rounded-lg border px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>
                  <option value="pendiente">Borrador (no visible)</option><option value="activo">Publicado</option><option value="finalizado">Finalizado</option>
                </select>
              </label>
              <button type="button" onClick={() => { setDeleteConfirm(''); setDeleteTarget(selected); }} className="admin-action admin-action-danger self-start sm:self-auto">Eliminar sorteo</button>
            </div>
          </section>
        </>}
      </div>
    ) : (
      /* ── Lista de sorteos ───────────────────────────────── */
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrar sorteos" className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: 'var(--color-admin-neutral-bg)' }}>
            {([['todos', 'Todos'], ['activo', 'Publicados'], ['pendiente', 'Borradores'], ['finalizado', 'Finalizados']] as const).map(([key, text]) => (
              <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors" style={filter === key ? { background: 'var(--color-admin-card)', color: 'var(--color-admin-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' } : { color: 'var(--color-admin-muted)' }}>
                {text} <span className="tabular text-xs opacity-70">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>


        <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
          {loading ? <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando sorteos…</p>
            : visible.length === 0 ? <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>{filter === 'todos' ? 'Todavía no hay sorteos. Créalo desde «Crear sorteo» en el menú.' : 'No hay sorteos en este estado.'}</p>
            : <ul>{visible.map((raffle, index) => (
              <li key={raffle.id} style={index > 0 ? { borderTop: '1px solid var(--color-admin-border)' } : undefined}>
                <button type="button" onClick={() => openRaffle(raffle)} className="raffle-row grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 text-left sm:grid-cols-[minmax(0,1fr)_120px_150px_120px_20px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold" style={{ color: 'var(--color-admin-text)' }}>{raffle.nombre}</span>
                    {brandOf(raffle.imagen_url) && <span className="mt-1 block"><BrandChip imagenUrl={raffle.imagen_url} /></span>}
                  </span>
                  <span className="justify-self-end sm:justify-self-start"><StatusBadge estado={raffle.estado} /></span>
                  <span className="text-xs sm:text-sm" style={{ color: 'var(--color-admin-muted)' }}>{shortRange(raffle.fechaInicio, raffle.fechaFin)}</span>
                  <span className="tabular justify-self-end text-xs sm:justify-self-start sm:text-sm" style={{ color: 'var(--color-admin-muted)' }}>{raffle.participantes} {raffle.participantes === 1 ? 'participante' : 'participantes'}</span>
                  <svg viewBox="0 0 24 24" className="hidden h-5 w-5 sm:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-admin-muted)' }}><path d="m9 6 6 6-6 6" /></svg>
                </button>
              </li>
            ))}</ul>}
        </div>
      </div>
    )}

    {qrRaffle && <Modal title={`QR · ${qrRaffle.nombre}`} onClose={() => setQrRaffle(null)}><div className="text-center">{qrImage ? <div className="mx-auto inline-block rounded-xl bg-white p-3"><img src={qrImage} alt={`Código QR para ${qrRaffle.nombre}`} className="h-64 w-64" /></div> : <p className="mx-auto flex h-64 max-w-xs items-center justify-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>{PUBLIC_BASE_URL ? 'Generando código QR...' : 'Configura VITE_PUBLIC_SITE_URL para generar el QR con tu dominio público.'}</p>}<p className="mt-4 break-all text-xs" style={{ color: 'var(--color-admin-muted)' }}>{publicUrl(qrRaffle.slug)}</p><div className="mt-4 flex justify-center gap-2"><a href={qrImage || undefined} onClick={(event) => { if (!qrImage) event.preventDefault(); }} download={`qr-${qrRaffle.slug}.png`} aria-disabled={!qrImage} className="admin-action">Descargar PNG</a><button onClick={() => void copyLink(qrRaffle)} disabled={!PUBLIC_BASE_URL} className="admin-action disabled:opacity-50">Copiar enlace</button><a href={publicUrl(qrRaffle.slug)} target="_blank" rel="noreferrer" className="admin-action">Abrir encuesta</a></div>{PUBLIC_BASE_URL && <p className="mt-3 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Dominio QR: {PUBLIC_BASE_URL}</p>}</div></Modal>}

    {deleteTarget && (() => {
      const needsTyping = deleteTarget.participantes > 0;
      const canDelete = !deleting && (!needsTyping || deleteConfirm.trim().toUpperCase() === 'ELIMINAR');
      return <Modal title="Eliminar sorteo" onClose={() => { if (!deleting) setDeleteTarget(null); }}>
        <div className="space-y-4 text-sm" style={{ color: 'var(--color-admin-text)' }}>
          <p>Vas a eliminar <strong>«{deleteTarget.nombre}»</strong>. Esta acción no se puede deshacer.</p>
          <ul className="space-y-1.5 rounded-xl px-4 py-3" style={{ background: 'var(--color-admin-danger-bg)', color: 'var(--color-admin-danger)' }}>
            <li>• Se borrarán sus <strong>{deleteTarget.participantes} participantes</strong> y sus respuestas.</li>
            <li>• Se borrarán sus preguntas y su imagen de fondo.</li>
            <li>• El enlace y el código QR del sorteo dejarán de funcionar.</li>
          </ul>
          {needsTyping && <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Para confirmar, escribe <strong style={{ color: 'var(--color-admin-text)' }}>ELIMINAR</strong>
            <input autoFocus value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }} />
          </label>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>Cancelar</button>
            <button type="button" onClick={() => void deleteRaffle(deleteTarget)} disabled={!canDelete} className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--color-admin-danger)', color: '#fff' }}>{deleting ? 'Eliminando…' : 'Eliminar sorteo'}</button>
          </div>
        </div>
      </Modal>;
    })()}
    <style>{`.admin-action-danger{border-color:var(--color-admin-danger-border)!important;color:var(--color-admin-danger)!important}.admin-action-danger:hover{background:var(--color-admin-danger-bg);opacity:1!important}.raffle-row{transition:background-color .15s ease}.raffle-row:hover{background:var(--color-admin-bg)}.raffle-row:focus-visible{outline:2px solid var(--color-admin-primary);outline-offset:-2px}.admin-action{border:1px solid var(--color-admin-border);border-radius:8px;padding:7px 10px;color:var(--color-admin-text);font-size:13px;white-space:nowrap}.admin-action:hover{opacity:.8}`}</style>
  </div>;
}

const MONTH = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });

/** "1 oct – 22 dic" a partir de dos fechas ISO. */
function shortRange(start: string, end: string) {
  const f = (iso: string) => (iso ? MONTH.format(new Date(`${iso}T12:00:00`)).replace('.', '') : '—');
  return `${f(start)} – ${f(end)}`;
}

const STATUS_STYLE: Record<AdminSorteo['estado'], { bg: string; fg: string }> = {
  activo: { bg: 'var(--color-admin-success-bg)', fg: 'var(--color-admin-success)' },
  pendiente: { bg: 'var(--color-admin-warning-bg)', fg: 'var(--color-admin-warning)' },
  finalizado: { bg: 'var(--color-admin-neutral-bg)', fg: 'var(--color-admin-muted)' },
};

function StatusBadge({ estado }: { estado: AdminSorteo['estado'] }) {
  const style = STATUS_STYLE[estado];
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: style.bg, color: style.fg }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: style.fg }} aria-hidden="true" />{STATUS_LABEL[estado]}</span>;
}

function BrandChip({ imagenUrl }: { imagenUrl: string | null }) {
  const brand = brandOf(imagenUrl);
  if (!brand) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}><img src={brand.logo} alt="" className="h-4 w-auto" />{brand.label}</span>;
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SorteoEditor({ form, setForm, questions, setQuestions, backgroundPreview, backgroundOriginalSize, compressedBackgroundSize, compressingBackground, onBackgroundFile, onClearBackground, onAddQuestion, saving, editing, onSave, onCancel }: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  questions: QuestionDraft[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>;
  backgroundPreview: string;
  backgroundOriginalSize: number | null;
  compressedBackgroundSize: number | null;
  compressingBackground: boolean;
  onBackgroundFile: (file: File | undefined) => void;
  onClearBackground: () => void;
  onAddQuestion: () => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return <section className="animate-fade-in space-y-5 rounded-2xl border p-5 sm:p-6" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
    <h2 className="font-display text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>{editing ? 'Editar sorteo' : 'Nuevo sorteo'}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>¿De qué negocio es este sorteo? *</legend>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Define los logos que verán los participantes en la encuesta y en los textos legales.</p>
        <div role="radiogroup" className="mt-2 grid gap-3 sm:grid-cols-2">
          {BRANDS.map((brand) => {
            const active = form.imagenUrl === brand.key;
            return (
              <button
                key={brand.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setForm((previous) => ({ ...previous, imagenUrl: brand.key }))}
                className="relative flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-colors"
                style={{
                  borderColor: active ? 'var(--color-admin-primary)' : 'var(--color-admin-border)',
                  background: active ? 'var(--color-admin-primary-bg)' : 'var(--color-admin-card)',
                  color: 'var(--color-admin-text)',
                }}
              >
                <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                  <img src={brand.logo} alt="" className="max-h-full max-w-full object-contain" />
                </span>
                <span className="font-medium">{brand.label}</span>
                <span aria-hidden="true" className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: active ? 'var(--color-admin-primary)' : 'var(--color-admin-chart-muted)' }}>
                  {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-admin-primary)' }} />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Plantilla de la página</legend>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Diseño que verán los participantes. Las plantillas se pueden reutilizar en cualquier sorteo.</p>
        <div role="radiogroup" className="mt-2 grid gap-3 sm:grid-cols-2">
          {TEMPLATE_OPTIONS.map((template) => {
            const active = form.tipo === template.id;
            const [bg, title, accent] = template.swatches;
            return (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setForm((previous) => ({ ...previous, tipo: template.id }))}
                className="flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-colors"
                style={{ borderColor: active ? 'var(--color-admin-primary)' : 'var(--color-admin-border)', background: active ? 'var(--color-admin-primary-bg)' : 'var(--color-admin-card)', color: 'var(--color-admin-text)' }}
              >
                <span aria-hidden="true" className="flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border" style={{ background: bg, borderColor: 'var(--color-admin-border)' }}>
                  <span className="h-1.5 w-8 rounded-full" style={{ background: title }} />
                  <span className="h-1 w-6 rounded-full opacity-60" style={{ background: title }} />
                  <span className="mt-1 h-2.5 w-7 rounded-full" style={{ background: accent }} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{template.label}</span>
                  <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{template.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <OnSiteOption form={form} setForm={setForm} />
      <AdminInput label="Título" required value={form.nombre} onChange={(value) => setForm((previous) => ({ ...previous, nombre: value }))} />
      <AdminInput label="Descripción" value={form.descripcion} onChange={(value) => setForm((previous) => ({ ...previous, descripcion: value }))} />
      <AdminInput label="Fecha de inicio" type="date" required value={form.fechaInicio} onChange={(value) => setForm((previous) => ({ ...previous, fechaInicio: value }))} />
      <AdminInput label="Fecha de cierre" type="date" required value={form.fechaFin} onChange={(value) => setForm((previous) => ({ ...previous, fechaFin: value }))} />
      <AdminTextarea label="Premio" value={form.premioNombre} onChange={(value) => setForm((previous) => ({ ...previous, premioNombre: value }))} />
      <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Estado<select value={form.estado} onChange={(event) => setForm((previous) => ({ ...previous, estado: event.target.value as AdminSorteo['estado'] }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}><option value="pendiente">Borrador</option><option value="activo">Publicado</option><option value="finalizado">Finalizado</option></select></label>
      {TEMPLATE_OPTIONS.find((option) => option.id === form.tipo)?.usesBackground && <div className="sm:col-span-2">
        <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Imagen de fondo de este sorteo</label>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Se convertirá a WebP y se optimizará automáticamente (máximo 20 MB por archivo original).</p>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => onBackgroundFile(event.currentTarget.files?.[0])}
          disabled={compressingBackground}
          className="mt-2 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2"
          style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}
        />
        {compressingBackground && <p className="mt-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Convirtiendo y comprimiendo imagen...</p>}
        {!compressingBackground && compressedBackgroundSize !== null && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
            WebP optimizada: {formatFileSize(compressedBackgroundSize)}
            {backgroundOriginalSize !== null && ` (original: ${formatFileSize(backgroundOriginalSize)})`}
          </p>
        )}
        {backgroundPreview && (
          <div className="mt-3">
            <img src={backgroundPreview} alt="Vista previa del fondo del sorteo" className="h-40 w-full rounded-xl border object-cover" style={{ borderColor: 'var(--color-admin-border)' }} />
            <button type="button" onClick={onClearBackground} disabled={compressingBackground} className="mt-2 text-xs underline disabled:opacity-50" style={{ color: 'var(--color-brand-error)' }}>Quitar imagen de fondo</button>
          </div>
        )}
      </div>}
    </div>
    <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--color-admin-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold" style={{ color: 'var(--color-admin-text)' }}>Preguntas adicionales</h3><button type="button" onClick={onAddQuestion} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}>+ Añadir pregunta</button></div>
      {questions.map((question, index) => <div key={question.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_180px_auto]" style={{ borderColor: 'var(--color-admin-border)' }}>
        <div className="space-y-3"><AdminInput label={`Pregunta ${index + 1}`} required value={question.texto} onChange={(value) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, texto: value } : item))} />
          {question.tipo !== 'texto' && <AdminInput label="Opciones, separadas por coma" value={question.opciones.join(', ')} onChange={(value) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, opciones: value.split(',') } : item))} />}
        </div>
        <div className="space-y-3"><label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Tipo<select value={question.tipo} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, tipo: event.target.value as QuestionDraft['tipo'], opciones: event.target.value === 'texto' ? [] : item.opciones } : item))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}><option value="texto">Texto</option><option value="seleccion_unica">Selección única</option><option value="seleccion_multiple">Selección múltiple</option></select></label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}><input type="checkbox" checked={question.requerida} onChange={(event) => setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, requerida: event.target.checked } : item))} />Obligatoria</label>
        </div>
        <button type="button" title="Quitar pregunta" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="self-start rounded-lg px-3 py-2 text-xs" style={{ color: 'var(--color-brand-error)' }}>Quitar</button>
      </div>)}
      {questions.length === 0 && <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>Este sorteo todavía no tiene preguntas personalizadas.</p>}
    </div>
    <div className="flex gap-3"><button type="button" onClick={onSave} disabled={saving || compressingBackground || !supabase} className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>{compressingBackground ? 'Optimizando imagen...' : saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sorteo'}</button><button type="button" onClick={onCancel} disabled={saving || compressingBackground} className="rounded-lg border px-5 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}>Cancelar</button></div>
  </section>;
}

/** "¿Quién puede participar?": cualquier persona (por defecto) o solo quienes estén en el local. */
function OnSiteOption({ form, setForm }: { form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>> }) {
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadBusinesses().then(({ businesses: loaded }) => { if (!cancelled) setBusinesses(loaded); });
    return () => { cancelled = true; };
  }, []);
  const brand = brandOf(form.imagenUrl);
  const business = brand && businesses ? businesses.find((item) => item.brand === brand.id) : null;
  const place = business?.name ?? 'el local';
  const options = [
    {
      value: false,
      title: 'Cualquier persona',
      text: 'Sin restricciones: se puede participar desde cualquier lugar con el enlace o el QR.',
      icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" /></>,
    },
    {
      value: true,
      title: 'Solo en el local',
      text: business && hasCoordinates(business)
        ? `Solo quienes estén a ${business.radius} m o menos de ${place}. El celular pide la ubicación al enviar.`
        : 'Solo quienes estén cerca del negocio. El celular pide la ubicación al enviar.',
      icon: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
    },
  ];
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>¿Quién puede participar?</legend>
      <div role="radiogroup" className="mt-2 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = form.soloEnLocal === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setForm((previous) => ({ ...previous, soloEnLocal: option.value }))}
              className="flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors"
              style={{ borderColor: active ? 'var(--color-admin-primary)' : 'var(--color-admin-border)', background: active ? 'var(--color-admin-primary-bg)' : 'var(--color-admin-card)', color: 'var(--color-admin-text)' }}
            >
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: active ? 'var(--color-admin-primary)' : 'var(--color-admin-muted)' }}>{option.icon}</svg>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{option.title}</span>
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{option.text}</span>
              </span>
              <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: active ? 'var(--color-admin-primary)' : 'var(--color-admin-chart-muted)' }}>
                {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-admin-primary)' }} />}
              </span>
            </button>
          );
        })}
      </div>
      {form.soloEnLocal && !brand && <p className="mt-2 text-xs" style={{ color: 'var(--color-admin-warning)' }}>Elige arriba el negocio del sorteo para saber qué local usar.</p>}
      {form.soloEnLocal && business && !hasCoordinates(business) && <p className="mt-2 text-xs" style={{ color: 'var(--color-admin-warning)' }}>{business.name} todavía no tiene coordenadas. Configúralas en Ubicaciones → Datos de los negocios; mientras tanto no se bloqueará a nadie.</p>}
    </fieldset>
  );
}

function AdminInput({ label, value, onChange, type = 'text', required = false, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{label}{required ? ' *' : ''}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} max={type === 'date' ? '9999-12-31' : undefined} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }} /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="presentation" onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="px-2 text-xl" style={{ color: 'var(--color-admin-muted)' }}>×</button></div>{children}</section></div>;
}

function AdminTextarea({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }} /></label>;
}