const UMARU_LOGO = '/umaru.svg';
const FLORES_LOGO = '/flores.svg';

export const RAFFLE_LOGO_OPTIONS = [
  { value: UMARU_LOGO, label: 'Umaru', preview: UMARU_LOGO },
  { value: FLORES_LOGO, label: 'Flores', preview: FLORES_LOGO },
];

export function resolveRaffleLogo(imageUrl: string | null | undefined): string {
  if (imageUrl === '/flores.png' || imageUrl === FLORES_LOGO) return FLORES_LOGO;
  if (imageUrl === '/umaru.png' || imageUrl === UMARU_LOGO || !imageUrl) return UMARU_LOGO;
  return imageUrl;
}
