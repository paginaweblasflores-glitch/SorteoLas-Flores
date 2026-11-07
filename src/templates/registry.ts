import { navidadTemplate } from './navidad/template';
import { taxiTemplate } from './taxi/template';
import type { PosterTemplate, TemplateId } from './types';

export type TemplateOption = { id: TemplateId; label: string; description: string; swatches: [string, string, string]; usesBackground: boolean };

/** Plantillas disponibles. Para un evento nuevo: crear su carpeta y agregarla aquí. */
export const POSTER_TEMPLATES: PosterTemplate[] = [navidadTemplate, taxiTemplate];

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: 'clasica', label: 'Clásica', description: 'Foto de fondo y formulario. Para cualquier sorteo.', swatches: ['#1d1512', '#fbf6ea', '#a9253d'], usesBackground: true },
  ...POSTER_TEMPLATES.map(({ id, label, description, swatches, usesBackground }) => ({ id, label, description, swatches, usesBackground: Boolean(usesBackground) })),
];

const NAVIDAD_NAME = /navidad|naviden[oa]s?/;

/** Plantilla de un sorteo: la elegida en el panel o, para sorteos antiguos, la que sugiere su nombre. */
export function templateIdFor(raffle: { tipo?: string | null; nombre?: string | null }): TemplateId {
  const stored = raffle.tipo?.trim().toLowerCase();
  if (stored && TEMPLATE_OPTIONS.some((option) => option.id === stored)) return stored as TemplateId;
  const name = raffle.nombre?.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() ?? '';
  if (NAVIDAD_NAME.test(name)) return 'navidad';
  if (/taxi/.test(name)) return 'taxi';
  return 'clasica';
}

export function posterTemplate(id: TemplateId): PosterTemplate | null {
  return POSTER_TEMPLATES.find((template) => template.id === id) ?? null;
}
