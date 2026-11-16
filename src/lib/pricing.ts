import type { Service, ServicePrice, VehicleCategory } from './database.types';

export type PriceMatrix = Map<string, Partial<Record<VehicleCategory, number>>>;

/** Agrupa as linhas de service_prices por serviço: matrix.get(serviceId)?.SUV */
export function buildPriceMatrix(prices: Pick<ServicePrice, 'service_id' | 'category' | 'price'>[]): PriceMatrix {
  const m: PriceMatrix = new Map();
  for (const p of prices) {
    const row = m.get(p.service_id) ?? {};
    row[p.category] = Number(p.price);
    m.set(p.service_id, row);
  }
  return m;
}

export function priceFor(matrix: PriceMatrix, serviceId: string, category: VehicleCategory): number | null {
  const v = matrix.get(serviceId)?.[category];
  return v === undefined ? null : v;
}

/** Serviços que têm preço para o porte do carro (os outros somem do passo 2). */
export function servicesForCategory<S extends Pick<Service, 'id' | 'active'>>(services: S[], matrix: PriceMatrix, category: VehicleCategory): S[] {
  return services.filter((s) => s.active && priceFor(matrix, s.id, category) !== null);
}

export interface QuoteItem {
  serviceId: string;
  name: string;
  price: number;
  durationMin: number;
}

export interface Quote {
  items: QuoteItem[];
  total: number;
  durationMin: number;
}

/** Orçamento do agendamento: serviço principal + adicionais pelo porte do carro (mesma regra do banco). */
export function quote(
  services: Pick<Service, 'id' | 'name' | 'duration_min'>[],
  matrix: PriceMatrix,
  category: VehicleCategory,
  mainId: string | null,
  addonIds: string[],
): Quote {
  const ids = mainId ? [mainId, ...addonIds.filter((a) => a !== mainId)] : [];
  const items: QuoteItem[] = [];
  for (const id of new Set(ids)) {
    const s = services.find((x) => x.id === id);
    const price = priceFor(matrix, id, category);
    if (!s || price === null) continue;
    items.push({ serviceId: id, name: s.name, price, durationMin: s.duration_min });
  }
  const total = Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
  const durationMin = items.reduce((sum, i) => sum + i.durationMin, 0);
  return { items, total, durationMin };
}
