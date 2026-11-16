import type { VehicleCategory } from './database.types';

export const CATEGORIES: VehicleCategory[] = ['HATCH', 'SEDAN', 'SUV', 'PICKUP'];

/** Seletor visual de porte: o cliente pensa em tamanho, o preço usa a categoria. */
export const CATEGORY_INFO: Record<VehicleCategory, { label: string; size: string; example: string }> = {
  HATCH: { label: 'Hatch', size: 'Pequeno', example: 'Onix, HB20, Gol' },
  SEDAN: { label: 'Sedan', size: 'Médio', example: 'Corolla, Virtus, Cruze' },
  SUV: { label: 'SUV', size: 'Grande', example: 'Compass, Creta, T-Cross' },
  PICKUP: { label: 'Caminhonete', size: 'Extra grande', example: 'Hilux, S10, Ranger' },
};

export function categoryLabel(c: VehicleCategory): string {
  return CATEGORY_INFO[c]?.label ?? c;
}

export function vehicleTitle(v: { model: string; plate: string; color?: string }): string {
  const parts = [v.model.trim() || 'Veículo', v.color?.trim()].filter(Boolean);
  return parts.join(' ');
}
