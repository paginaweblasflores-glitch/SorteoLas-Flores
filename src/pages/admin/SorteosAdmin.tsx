import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Sorteo } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

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
  premio_nombre: string | null;
  premio_descripcion: string | null;
};

type ParticipantResult = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  ciudad: string;
  created_at: string;
  respuestas: Record<string, string | string[]>;
  preguntas_snapshot: Array<{ id: string; texto: string; tipo: string; respuesta: string | string[] }>;
};

const configuredPublicUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const PUBLIC_BASE_URL = (configuredPublicUrl || (isLocalHost ? '' : window.location.origin)).replace(/\/+$/, '');
const EMPTY_FORM = {
  nombre: '', descripcion: '', tipo: 'Experiencia gastronómica', fechaInicio: '', fechaFin: '',
  premioNombre: '', premioDescripcion: '', estado: 'pendiente' as AdminSorteo['estado'],
};
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
    imagen_url: row.imagen_url, premio_nombre: row.premio_nombre, premio_descripcion: row.premio_descripcion,
  };
}

export default function SorteosAdmin() {
  const [sorteos, setSorteos] = useState<AdminSorteo[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<string[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qrRaffle, setQrRaffle] = useState<AdminSorteo | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [resultsRaffle, setResultsRaffle] = useState<AdminSorteo | null>(null);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const { data, error: loadError } = await supabase.from('sorteos')
        .select('id,slug,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,imagen_url,premio_nombre,premio_descripcion,participantes(count)')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (loadError) setError('No se pudieron cargar sorteos. Inicia sesión con una cuenta administradora y revisa las políticas de Supabase.');
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
    setQuestions([]);
    setOriginalQuestionIds([]);
  }

  function addQuestion() {
    setQuestions((current) => [...current, { id: crypto.randomUUID(), texto: '', tipo: 'texto', opciones: [], requerida: true }]);
  }

  async function editRaffle(raffle: AdminSorteo) {
    if (!supabase) return;
    setError('');
    setEditingId(raffle.id);
    setForm({ nombre: raffle.nombre, descripcion: raffle.descripcion, tipo: raffle.tipo, fechaInicio: raffle.fechaInicio, fechaFin: raffle.fechaFin, premioNombre: raffle.premio_nombre ?? '', premioDescripcion: raffle.premio_descripcion ?? '', estado: raffle.estado });
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
    if (!supabase || !form.nombre.trim() || !form.fechaInicio || !form.fechaFin || form.fechaFin < form.fechaInicio) {
      setError('Completa el título y las fechas; el cierre no puede ser anterior al inicio.');
      return;
    }
    if (questions.some((question) => !question.texto.trim() || (question.tipo !== 'texto' && question.opciones.filter(Boolean).length < 2))) {
      setError('Cada pregunta debe tener texto y las preguntas de selección deben tener al menos dos opciones.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), tipo: form.tipo,
      fecha_inicio: form.fechaInicio, fecha_fin: form.fechaFin, estado: form.estado,
      premio_nombre: form.premioNombre.trim() || null,
      premio_descripcion: form.premioDescripcion.trim() || null,
    };
    const draftPayload = { ...payload, estado: 'pendiente' as const };
    const result = editingId
      ? await supabase.from('sorteos').update(draftPayload).eq('id', editingId).select('id').single()
      : await supabase.from('sorteos').insert({ ...draftPayload, slug: makeSlug(form.nombre) }).select('id').single();
    if (result.error || !result.data) {
      setSaving(false);
      setError(result.error?.code === '23505' ? 'Ese enlace ya existe. Cambia el título e inténtalo nuevamente.' : 'No se pudo guardar el sorteo. Verifica los permisos y la configuración de Supabase.');
      return;
    }
    const raffleId = result.data.id as string;
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
    const { data, error: reloadError } = await supabase.from('sorteos')
      .select('id,slug,nombre,descripcion,tipo,fecha_inicio,fecha_fin,estado,imagen_url,premio_nombre,premio_descripcion,participantes(count)')
      .order('created_at', { ascending: false });
    if (!reloadError) setSorteos((data ?? []).map(mapRaffle));
    setSaving(false);
    closeForm();
  }

  async function updateStatus(raffle: AdminSorteo, status: AdminSorteo['estado']) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('sorteos').update({ estado: status }).eq('id', raffle.id);
    if (updateError) { setError('No se pudo actualizar el estado del sorteo.'); return; }
    setSorteos((current) => current.map((item) => item.id === raffle.id ? { ...item, estado: status } : item));
  }

  async function showResults(raffle: AdminSorteo) {
    if (!supabase) return;
    setResultsRaffle(raffle);
    setResultsLoading(true);
    const { data, error: resultError } = await supabase.from('participantes')
      .select('id,nombres,apellidos,telefono,ciudad,created_at,respuestas,preguntas_snapshot')
      .eq('sorteo_id', raffle.id).order('created_at', { ascending: false });
    setResultsLoading(false);
    if (resultError) { setResults([]); setError('No se pudieron consultar los resultados. Verifica tu sesión administradora.'); }
    else setResults((data ?? []) as ParticipantResult[]);
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

  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{sorteos.length} sorteos registrados</p>
      <button onClick={() => { setError(''); setEditingId(null); setForm(EMPTY_FORM); setQuestions([]); setOriginalQuestionIds([]); setShowForm(true); }} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>+ Nuevo sorteo</button>
    </div>
    {error && <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(232,85,71,0.12)', color: 'var(--color-brand-error)' }}>{error}</p>}
    {!supabase && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-admin-card)', color: 'var(--color-admin-muted)' }}>Configura Supabase para administrar sorteos y participantes. No se guardan datos de demostración.</p>}

    {showForm && !editingId && <SorteoEditor
      form={form}
      setForm={setForm}
      questions={questions}
      setQuestions={setQuestions}
      onAddQuestion={addQuestion}
      saving={saving}
      editing={false}
      onSave={() => { void saveRaffle(); }}
      onCancel={closeForm}
    />}

    <div className="grid gap-4">{loading ? <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Cargando sorteos...</p> : sorteos.map((raffle) => <div key={raffle.id} className="space-y-3">
    <article className="rounded-2xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="font-display text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>{raffle.nombre}</h3><span className="rounded-full px-2 py-1 text-xs" style={{ background: raffle.estado === 'activo' ? 'rgba(71,232,130,0.12)' : 'rgba(232,197,71,0.12)', color: raffle.estado === 'activo' ? '#2db86e' : 'var(--color-brand-gold-dim)' }}>{STATUS_LABEL[raffle.estado]}</span></div>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>{raffle.descripcion}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}><span>{raffle.fechaInicio} → {raffle.fechaFin}</span><span>{raffle.participantes} participantes</span>{raffle.premio_nombre && <span>Premio: {raffle.premio_nombre}</span>}</div>
          <a href={publicUrl(raffle.slug)} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs underline" style={{ color: 'var(--color-brand-gold-dim)' }}>{publicUrl(raffle.slug)}</a>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void editRaffle(raffle)} className="admin-action">Editar</button>
          <button onClick={() => setQrRaffle(raffle)} className="admin-action">Ver QR</button>
          <button onClick={() => void copyLink(raffle)} disabled={!PUBLIC_BASE_URL} className="admin-action disabled:opacity-50">{copied ? 'Copiado' : 'Copiar enlace'}</button>
          <a href={publicUrl(raffle.slug)} target="_blank" rel="noreferrer" className="admin-action">Abrir encuesta</a>
          <button onClick={() => void showResults(raffle)} className="admin-action">Resultados ({raffle.participantes})</button>
          <select aria-label={`Estado de ${raffle.nombre}`} value={raffle.estado} onChange={(event) => void updateStatus(raffle, event.target.value as AdminSorteo['estado'])} className="admin-action" style={{ background: 'var(--color-admin-bg)' }}><option value="pendiente">Borrador</option><option value="activo">Publicado</option><option value="finalizado">Finalizado</option></select>
        </div>
      </div>
    </article>
    {showForm && editingId === raffle.id && <SorteoEditor
      form={form}
      setForm={setForm}
      questions={questions}
      setQuestions={setQuestions}
      onAddQuestion={addQuestion}
      saving={saving}
      editing
      onSave={() => { void saveRaffle(); }}
      onCancel={closeForm}
    />}
    </div>)}</div>

    {qrRaffle && <Modal title={`QR · ${qrRaffle.nombre}`} onClose={() => setQrRaffle(null)}><div className="text-center">{qrImage ? <div className="mx-auto inline-block rounded-xl bg-white p-3"><img src={qrImage} alt={`Código QR para ${qrRaffle.nombre}`} className="h-64 w-64" /></div> : <p className="mx-auto flex h-64 max-w-xs items-center justify-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>{PUBLIC_BASE_URL ? 'Generando código QR...' : 'Configura VITE_PUBLIC_SITE_URL para generar el QR con tu dominio público.'}</p>}<p className="mt-4 break-all text-xs" style={{ color: 'var(--color-admin-muted)' }}>{publicUrl(qrRaffle.slug)}</p><div className="mt-4 flex justify-center gap-2"><a href={qrImage || undefined} onClick={(event) => { if (!qrImage) event.preventDefault(); }} download={`qr-${qrRaffle.slug}.png`} aria-disabled={!qrImage} className="admin-action">Descargar PNG</a><button onClick={() => void copyLink(qrRaffle)} disabled={!PUBLIC_BASE_URL} className="admin-action disabled:opacity-50">Copiar enlace</button><a href={publicUrl(qrRaffle.slug)} target="_blank" rel="noreferrer" className="admin-action">Abrir encuesta</a></div>{PUBLIC_BASE_URL && <p className="mt-3 text-xs" style={{ color: 'var(--color-admin-muted)' }}>Dominio QR: {PUBLIC_BASE_URL}</p>}</div></Modal>}

    {resultsRaffle && <Modal title={`Participantes · ${resultsRaffle.nombre}`} onClose={() => setResultsRaffle(null)}><p className="mb-4 text-sm" style={{ color: 'var(--color-admin-muted)' }}>{results.length} participantes registrados</p>{resultsLoading ? <p className="py-8 text-center text-sm">Cargando respuestas...</p> : results.length === 0 ? <p className="py-8 text-center text-sm" style={{ color: 'var(--color-admin-muted)' }}>Todavía no hay participantes.</p> : <div className="max-h-[65vh] space-y-3 overflow-y-auto">{results.map((participant) => <article key={participant.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-admin-border)' }}><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--color-admin-text)' }}>{participant.nombres} {participant.apellidos}</h3><p className="mt-1 text-xs" style={{ color: 'var(--color-admin-muted)' }}>{participant.telefono} · {participant.ciudad}</p></div><time className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{new Date(participant.created_at).toLocaleString('es-PE')}</time></div><div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-admin-border)' }}>{(participant.preguntas_snapshot ?? []).map((answer) => <p key={answer.id} className="text-xs"><strong style={{ color: 'var(--color-admin-text)' }}>{answer.texto}: </strong><span style={{ color: 'var(--color-admin-muted)' }}>{Array.isArray(answer.respuesta) ? answer.respuesta.join(', ') : answer.respuesta || 'Sin respuesta'}</span></p>)}</div></article>)}</div>}</Modal>}
    <style>{`.admin-action{border:1px solid var(--color-admin-border);border-radius:8px;padding:7px 10px;color:var(--color-admin-text);font-size:12px;white-space:nowrap}.admin-action:hover{opacity:.8}`}</style>
  </div>;
}

function SorteoEditor({ form, setForm, questions, setQuestions, onAddQuestion, saving, editing, onSave, onCancel }: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  questions: QuestionDraft[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>;
  onAddQuestion: () => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return <section className="animate-fade-in space-y-5 rounded-2xl border p-5 sm:p-6" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
    <h2 className="font-display text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-admin-text)' }}>{editing ? 'Editar sorteo' : 'Nuevo sorteo'}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <AdminInput label="Título" required value={form.nombre} onChange={(value) => setForm((previous) => ({ ...previous, nombre: value }))} />
      <AdminInput label="Descripción" value={form.descripcion} onChange={(value) => setForm((previous) => ({ ...previous, descripcion: value }))} />
      <AdminInput label="Tipo" value={form.tipo} onChange={(value) => setForm((previous) => ({ ...previous, tipo: value }))} />
      <AdminInput label="Fecha de inicio" type="date" required value={form.fechaInicio} onChange={(value) => setForm((previous) => ({ ...previous, fechaInicio: value }))} />
      <AdminInput label="Fecha de cierre" type="date" required value={form.fechaFin} onChange={(value) => setForm((previous) => ({ ...previous, fechaFin: value }))} />
      <AdminInput label="Premio" value={form.premioNombre} onChange={(value) => setForm((previous) => ({ ...previous, premioNombre: value }))} />
      <AdminTextarea label="Descripción del premio" value={form.premioDescripcion} onChange={(value) => setForm((previous) => ({ ...previous, premioDescripcion: value }))} />
      <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>Estado<select value={form.estado} onChange={(event) => setForm((previous) => ({ ...previous, estado: event.target.value as AdminSorteo['estado'] }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}><option value="pendiente">Borrador</option><option value="activo">Publicado</option><option value="finalizado">Finalizado</option></select></label>
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
    <div className="flex gap-3"><button type="button" onClick={onSave} disabled={saving || !supabase} className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--color-brand-gold)', color: 'var(--color-brand-bg)' }}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sorteo'}</button><button type="button" onClick={onCancel} className="rounded-lg border px-5 py-2.5 text-sm" style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-muted)' }}>Cancelar</button></div>
  </section>;
}

function AdminInput({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{label}{required ? ' *' : ''}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} max={type === 'date' ? '9999-12-31' : undefined} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }} /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="presentation" onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border p-5" style={{ background: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="px-2 text-xl" style={{ color: 'var(--color-admin-muted)' }}>×</button></div>{children}</section></div>;
}

function AdminTextarea({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return <label className="block text-xs" style={{ color: 'var(--color-admin-muted)' }}>{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ background: 'var(--color-admin-bg)', borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text)' }} /></label>;
}