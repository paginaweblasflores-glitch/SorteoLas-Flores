import type { BrandId } from '../assets/raffleLogos';
import { supabase } from './supabase';

/*
  Datos de los dos negocios (Las Flores y Umaru). Se guardan en la fila única de
  `configuracion_codigos_qr.negocios` (jsonb), la misma que ya usaban los QR de Google Maps,
  así que no hace falta cambiar la base de datos. Los valores por defecto vienen de las webs:
  restaurantelasflores.com y hotelumaru.com.
*/

export type Business = {
  brand: BrandId;
  name: string;
  address: string;
  phones: string;
  email: string;
  hours: string;
  mapsUrl: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  /** Coordenadas del local (texto decimal) y radio en metros para los sorteos "solo en el local". */
  lat: string;
  lng: string;
  radius: string;
};

const CONFIG_ID = 1;

function mapsSearch(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const DEFAULT_BUSINESSES: [Business, Business] = [
  {
    brand: 'flores',
    name: 'Restaurante Las Flores',
    address: 'Jr. José Olaya 106, Ayacucho, Perú',
    phones: '+51 967 456 230 / +51 980 723 422',
    email: 'contacto@restaurantelasflores.com',
    hours: 'Lunes a viernes: 7:00 a. m. – 5:30 p. m. · Sábado y domingo: 7:00 a. m. – 6:00 p. m.',
    mapsUrl: mapsSearch('Restaurante Las Flores, Jr. José Olaya 106, Ayacucho, Perú'),
    website: 'https://www.restaurantelasflores.com/',
    facebook: 'https://www.facebook.com/restaurantelasfloressac',
    instagram: 'https://www.instagram.com/restaurantelasflores/',
    tiktok: 'https://www.tiktok.com/@lasfloresayacucho',
    lat: '',
    lng: '',
    radius: '300',
  },
  {
    brand: 'umaru',
    name: 'Hotel Umaru',
    address: 'Valle de Huatatas, a 10 minutos de Ayacucho, Perú',
    phones: '+51 966 402 443 / +51 967 167 161',
    email: 'umaruhotel@gmail.com',
    hours: 'Recepción las 24 horas',
    mapsUrl: mapsSearch('Hotel Umaru, Valle de Huatatas, Ayacucho, Perú'),
    website: 'https://hotelumaru.com/es/',
    facebook: 'https://www.facebook.com/Umaruhotel',
    instagram: 'https://www.instagram.com/umaruhotel/',
    tiktok: '',
    lat: '',
    lng: '',
    radius: '500',
  },
];

const TEXT_FIELDS = ['name', 'address', 'phones', 'email', 'hours', 'mapsUrl', 'website', 'facebook', 'instagram', 'tiktok', 'lat', 'lng', 'radius'] as const;

/** Une lo guardado (incluido el formato antiguo { name, mapsUrl }) con los valores por defecto. */
function normalize(saved: unknown): [Business, Business] {
  const result: [Business, Business] = [{ ...DEFAULT_BUSINESSES[0] }, { ...DEFAULT_BUSINESSES[1] }];
  if (!Array.isArray(saved)) return result;
  for (const item of saved) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    const brand: BrandId = record.brand === 'umaru' || record.brand === 'flores'
      ? record.brand
      : /umaru/i.test(name) ? 'umaru' : 'flores';
    const target = result[brand === 'flores' ? 0 : 1];
    for (const field of TEXT_FIELDS) {
      const value = record[field];
      if (typeof value === 'string' && value.trim()) target[field] = value;
    }
  }
  return result;
}

export async function loadBusinesses(): Promise<{ businesses: [Business, Business]; error: string }> {
  if (!supabase) return { businesses: normalize(null), error: 'Supabase no está configurado; los cambios no se podrán guardar.' };
  const { data, error } = await supabase.from('configuracion_codigos_qr').select('negocios').eq('id', CONFIG_ID).maybeSingle();
  if (error) return { businesses: normalize(null), error: `No se pudieron cargar los datos guardados. ${error.message}` };
  return { businesses: normalize(data?.negocios), error: '' };
}

export async function saveBusinesses(businesses: [Business, Business]): Promise<string> {
  if (!supabase) return 'Supabase no está configurado; no se pudo guardar.';
  const clean = businesses.map((business) => Object.fromEntries(
    Object.entries(business).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  ));
  const { error } = await supabase.from('configuracion_codigos_qr').upsert({ id: CONFIG_ID, negocios: clean }, { onConflict: 'id' });
  return error ? `No se pudieron guardar los cambios. ${error.message}` : '';
}

export function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      url.hostname === 'goo.gl'
      || url.hostname === 'maps.app.goo.gl'
      || url.hostname === 'google.com'
      || url.hostname.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

/** true si el negocio tiene coordenadas válidas para verificar la ubicación. */
export function hasCoordinates(business: Pick<Business, 'lat' | 'lng'>) {
  const lat = Number(business.lat);
  const lng = Number(business.lng);
  return business.lat.trim() !== '' && business.lng.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export const RADIUS_OPTIONS = [150, 200, 300, 400, 500, 800, 1000];
