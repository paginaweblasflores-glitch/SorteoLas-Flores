import floresPng from './flores.png';
import umaruPng from './umaru.png';

export const RAFFLE_LOGO_OPTIONS = [
  { value: '/umaru.png', label: 'Umaru', preview: umaruPng },
  { value: '/flores.png', label: 'Flores', preview: floresPng },
];

export function resolveRaffleLogo(imageUrl: string | null | undefined): string {
  if (imageUrl === '/flores.png' || imageUrl === '/flores.svg') return floresPng;
  if (imageUrl === '/umaru.png' || imageUrl === '/umaru.svg' || !imageUrl) return umaruPng;
  return imageUrl;
}
