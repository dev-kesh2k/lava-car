import type { Service, ServiceKind, ServicePrice, VehicleCategory } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export interface Catalog {
  services: Service[];
  prices: ServicePrice[];
}

export async function getCatalog(includeInactive = false): Promise<Catalog> {
  let q = supabase.from('services').select('*').order('kind').order('sort_order').order('name');
  if (!includeInactive) q = q.eq('active', true);
  const [s, p] = await Promise.all([q, supabase.from('service_prices').select('*')]);
  if (s.error) throw s.error;
  if (p.error) throw p.error;
  return { services: s.data ?? [], prices: p.data ?? [] };
}

export interface ServiceInput {
  name: string;
  description: string;
  kind: ServiceKind;
  duration_min: number;
  active: boolean;
  sort_order?: number;
}

export async function saveService(tenantId: string, input: ServiceInput, id?: string): Promise<Service> {
  const q = id
    ? supabase.from('services').update(input).eq('id', id)
    : supabase.from('services').insert({ ...input, tenant_id: tenantId });
  const { data, error } = await q.select('*').single();
  if (error) throw error;
  return data;
}

/** Grava a linha da matriz de preços; porte sem valor some do catálogo daquele porte. */
export async function saveServicePrices(
  tenantId: string,
  serviceId: string,
  prices: Partial<Record<VehicleCategory, number | null>>,
): Promise<void> {
  const upserts = Object.entries(prices)
    .filter(([, v]) => v !== null && v !== undefined && Number.isFinite(v))
    .map(([category, price]) => ({ service_id: serviceId, tenant_id: tenantId, category: category as VehicleCategory, price: Number(price) }));
  const removed = Object.entries(prices)
    .filter(([, v]) => v === null)
    .map(([c]) => c as VehicleCategory);
  if (upserts.length) {
    const { error } = await supabase.from('service_prices').upsert(upserts);
    if (error) throw error;
  }
  if (removed.length) {
    const { error } = await supabase.from('service_prices').delete().eq('service_id', serviceId).in('category', removed);
    if (error) throw error;
  }
}
