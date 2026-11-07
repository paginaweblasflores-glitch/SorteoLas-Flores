import '@fontsource/kaushan-script';
import './taxi.css';
import type { PosterTemplate } from '../types';
import TaxiPage from './TaxiPage';

export const taxiTemplate: PosterTemplate = {
  id: 'taxi',
  label: 'Taxi',
  description: 'Ruta al premio: ámbar y café, cortes en diagonal y pines de mapa.',
  className: 'tx',
  kicker: null,
  closing: '¡Buena ruta y mucha suerte!',
  farewell: '¡Buena ruta y mucha suerte!',
  swatches: ['#ececec', '#3a2409', '#f6ae19'],
  heroImage: '/plantillas/taxi/portada.webp',
  Page: TaxiPage,
};
