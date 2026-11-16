import { useCallback, useEffect, useState } from 'react';

export const API_BASE = `${import.meta.env.BASE_URL}api`;
/** Prefixo do localStorage pelo caminho do app (/<slug>/): apps no mesmo domínio não se misturam. */
export const STORAGE_NS = import.meta.env.BASE_URL.replace(/\//g, '') || 'app';
const TOKEN_KEY = `${STORAGE_NS}:token`;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Erro ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

/** Imagem protegida (referências): baixa com o token e devolve uma URL local. */
export async function fetchImageUrl(path: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, 'Imagem indisponível');
  return URL.createObjectURL(await res.blob());
}

/** Foto da vistoria: a equipe usa o token (fetchImageUrl); o cliente, o celular. */
export const inspectionPhotoUrl = (id: string, phone: string) => `${API_BASE}/inspection-photos/${id}?phone=${encodeURIComponent(phone)}`;

/** Carrega um recurso da API; `reload` busca de novo sem piscar a tela. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

// ---------- Tipos ----------
export type Role = 'admin' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  commissionPct: number;
  active: boolean;
  createdAt: string;
}

/** Horário de funcionamento de um dia da semana (índice 0 = domingo). */
export interface DaySchedule {
  open: boolean;
  from: string;
  to: string;
}

export interface Config {
  studioName: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  schedule: DaySchedule[];
  slotIntervalMin: number;
  loyaltyGoal: number;
  pixEnabled: boolean;
  boxes: number;
  logoVersion: number;
  about: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
  googleReviewUrl: string;
  today: string;
  now: string;
}

/** Caminho relativo devolvido pela API (ex.: "client-avatars/<id>?v=2") → URL completa. */
export const apiUrl = (rel: string | null | undefined) => (rel ? `${API_BASE}/${rel}` : undefined);

export type Size = 'small' | 'medium' | 'large' | 'pickup';

export interface Service {
  id: string;
  name: string;
  description: string;
  kind: 'main' | 'addon';
  durationMin: number;
  icon: string;
  active: boolean;
  prices: { size: Size; priceCents: number }[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  color: string;
  size: Size;
  phone?: string;
  clientName?: string;
  phoneKey?: string;
}

export type OrderStatus = 'scheduled' | 'waiting' | 'washing' | 'finishing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  serviceId: string | null;
  kind: 'main' | 'addon';
  name: string;
  priceCents: number;
  durationMin: number;
}

export interface Order {
  id: string;
  number: number;
  origin: 'app' | 'counter';
  clientName: string;
  clientPhone: string;
  phoneKey: string;
  vehicleId: string;
  plate: string;
  model: string;
  color: string;
  size: Size;
  box: { id: string; name: string } | null;
  employee?: { id: string; name: string } | null;
  date: string;
  time: string;
  durationMin: number;
  totalCents: number;
  discountCents: number;
  dueCents: number;
  status: OrderStatus;
  paymentMethod: 'onsite' | 'pix';
  paymentStatus: 'pending' | 'paid';
  paidMethod: string;
  rewardUsed: boolean;
  notes: string;
  cancelReason: string;
  items: OrderItem[];
  photos: string[];
  review: { rating: number; comment: string } | null;
  startedAt: string | null;
  finishedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Loyalty {
  goal: number;
  stamps: number;
  rewards: number;
  totalWashes: number;
  remaining: number;
}

export interface Box {
  id: string;
  name: string;
  active: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Slot {
  time: string;
  available: boolean;
  free: number;
}
