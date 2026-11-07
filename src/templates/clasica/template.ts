import './clasica.css';
import type { PosterTemplate } from '../types';
import { ClassicBottom, ClassicOrnament, ClassicTop } from './Decor';

export const clasicaTemplate: PosterTemplate = {
  id: 'clasica',
  label: 'Clásica',
  description: 'Sobria y elegante: marfil, carbón y topo. Para cualquier sorteo.',
  className: 'tpl-clasica',
  kicker: null,
  closing: 'Gracias por participar',
  farewell: '¡Mucha suerte!',
  swatches: ['#f8f7f4', '#1f1e1c', '#9a876d'],
  usesBackground: true,
  headerClass: 'mt-6',
  Top: ClassicTop,
  Bottom: ClassicBottom,
  Ornament: ClassicOrnament,
};
