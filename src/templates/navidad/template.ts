import '@fontsource-variable/cormorant-garamond';
import '@fontsource/great-vibes';
import './navidad.css';
import type { PosterTemplate } from '../types';
import { GarlandBottom, GarlandTop } from './Garland';
import { StarAccents, TitleStar } from './Star';

export const navidadTemplate: PosterTemplate = {
  id: 'navidad',
  label: 'Navidad',
  description: 'Fondo blanco, guirnalda con esferas y estrellas, verde y rojo.',
  className: 'tpl-navidad',
  kicker: null,
  closing: '¡Felices fiestas!',
  farewell: '¡Felices fiestas y mucha suerte!',
  swatches: ['#ffffff', '#3d6b29', '#c8161d'],
  headerClass: '-mt-[44px] sm:-mt-[60px]',
  Top: GarlandTop,
  Bottom: GarlandBottom,
  Ornament: TitleStar,
  Accents: StarAccents,
};
