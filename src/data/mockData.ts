export const RESTAURANT = {
  name: 'La Parrilla del Chef',
  address: 'Av. Larco 1234, Miraflores, Lima',
  lat: -12.1191,
  lng: -77.0282,
  radiusMeters: 150,
  phone: '+51 1 234-5678',
  logo: '🍖',
};

export type Participant = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  fecha: string;
  hora: string;
  sorteoId: string;
  estado: 'activo' | 'ganador' | 'descalificado';
};

export type RegisteredParticipant = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  distrito?: string | null;
  participacion_fecha: string;
  created_at: string;
  sorteo_id: string;
  estado: 'activo' | 'ganador' | 'descalificado';
};

export type Premio = {
  id: string;
  nombre: string;
  descripcion: string;
  valor: number;
  imagen: string;
  sorteoId: string;
  ganadorId?: string;
};

export type Sorteo = {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'activo' | 'pendiente' | 'finalizado';
  participantes: number;
  premios: number;
};

export type Ganador = {
  id: string;
  participanteId: string;
  premioId: string;
  sorteoId: string;
  nombres: string;
  apellidos: string;
  dni: string;
  premio: string;
  fecha: string;
  notificado: boolean;
};

export const SORTEOS: Sorteo[] = [
  {
    id: 's3',
    nombre: 'Sorteo Navideño',
    descripcion: 'El gran sorteo de fin de año con los mejores premios.',
    tipo: 'Premios y productos',
    fechaInicio: '2026-12-01',
    fechaFin: '2026-12-24',
    estado: 'pendiente',
    participantes: 0,
    premios: 5,
  },
  {
    id: 'demo-taxista-2026',
    nombre: 'Sorteo Taxista Ayacucho',
    descripcion: 'Sorteo para taxistas independientes y empresas de taxi de Ayacucho.',
    tipo: 'Sorteo para taxistas',
    fechaInicio: '2026-09-30',
    fechaFin: '2026-12-31',
    estado: 'activo',
    participantes: 0,
    premios: 1,
  },
];

export const PARTICIPANTES: Participant[] = [];

export const PREMIOS: Premio[] = [];

export const GANADORES: Ganador[] = [];

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function hasParticipatedToday(identifier: string): boolean {
  const key = `raffle_${getTodayKey()}_${identifier}`;
  return localStorage.getItem(key) === 'true';
}

export function markParticipatedToday(identifier: string): void {
  const key = `raffle_${getTodayKey()}_${identifier}`;
  localStorage.setItem(key, 'true');
}

const LOCAL_PARTICIPANTS_KEY = 'raffle_local_participants';

export function getLocalParticipants(): RegisteredParticipant[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PARTICIPANTS_KEY) ?? '[]') as RegisteredParticipant[];
  } catch {
    return [];
  }
}

export function saveLocalParticipant(participant: Omit<RegisteredParticipant, 'id'>): void {
  const saved = getLocalParticipants();
  saved.unshift({ ...participant, id: crypto.randomUUID() });
  localStorage.setItem(LOCAL_PARTICIPANTS_KEY, JSON.stringify(saved));
}
