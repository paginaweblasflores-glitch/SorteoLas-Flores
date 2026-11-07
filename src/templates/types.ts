import type { ComponentType } from 'react';
import type { PosterPageProps } from './EventPoster';

export type AccentSlot = 'premios' | 'participa';

/** Identificador guardado en `sorteos.tipo`. */
export type TemplateId = 'clasica' | 'navidad' | 'taxi';

/**
 * Plantilla de evento tipo "afiche": página limpia, decoración arriba y abajo,
 * tipografía y colores propios. Cada plantilla nueva solo define esto.
 */
export type PosterTemplate = {
  id: TemplateId;
  label: string;
  /** Una línea para el selector del panel. */
  description: string;
  /** Clase CSS que declara las variables --ev-* de la plantilla. */
  className: string;
  /** Texto en arco sobre el título; null si la plantilla usa un adorno en su lugar. */
  kicker: string | null;
  /** Frase manuscrita de cierre, sobre el logo. */
  closing?: string;
  /** Saludo al terminar la participación. */
  farewell: string;
  /** true si la página muestra la imagen de fondo del sorteo (se sube en el panel). */
  usesBackground?: boolean;
  /** Imagen de portada propia de la plantilla (en public/plantillas/<id>/). */
  heroImage?: string;
  /** Colores para la miniatura del selector: fondo, título, acento. */
  swatches: [string, string, string];
  /** Separación del encabezado respecto a la decoración superior (clases de Tailwind). */
  headerClass?: string;
  Top?: ComponentType;
  Bottom?: ComponentType;
  /** Diseño de página propio; si no se indica, se usa el afiche compartido (EventPoster). */
  Page?: ComponentType<PosterPageProps>;
  /** Adorno sobre el título. */
  Ornament?: ComponentType;
  /** Decoración que asoma por el borde de la pantalla junto a los títulos de sección. */
  Accents?: ComponentType<{ slot: AccentSlot }>;
};
