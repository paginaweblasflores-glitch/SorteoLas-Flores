/**
 * Marcas del panel: cada sorteo pertenece a Umaru o a Las Flores.
 * La marca se guarda en `sorteos.imagen_url` con estas claves (se mantienen
 * por compatibilidad con los sorteos ya creados).
 */
export type BrandId = 'umaru' | 'flores';

export type Brand = {
  id: BrandId;
  /** Valor guardado en `sorteos.imagen_url`. */
  key: string;
  label: string;
  /** Logo para fondos claros. */
  logo: string;
  /** Logo para fondos oscuros (imagen de fondo del sorteo, barra del panel). */
  logoOnDark: string;
};

export const BRANDS: Brand[] = [
  { id: 'umaru', key: '/umaru.svg', label: 'Umaru', logo: '/umaru-color.png', logoOnDark: '/umaru-white.png' },
  { id: 'flores', key: '/flores.svg', label: 'Las Flores', logo: '/logo-las-flores-black.webp', logoOnDark: '/logo-las-flores-white.webp' },
];

export function getBrand(id: BrandId): Brand {
  return BRANDS.find((brand) => brand.id === id) ?? BRANDS[0];
}

/** Marca de un sorteo a partir de su `imagen_url`; null si aún no tiene. */
export function brandOf(imagenUrl: string | null | undefined): Brand | null {
  const value = imagenUrl?.toLowerCase() ?? '';
  if (!value) return null;
  if (value.includes('flores')) return getBrand('flores');
  if (value.includes('umaru')) return getBrand('umaru');
  return null;
}

/** Logo a mostrar para un sorteo según el fondo sobre el que va. */
export function raffleLogo(imagenUrl: string | null | undefined, onDark = false): string | null {
  const brand = brandOf(imagenUrl);
  if (brand) return onDark ? brand.logoOnDark : brand.logo;
  return imagenUrl || null;
}
