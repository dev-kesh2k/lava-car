import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_INFO, categoryLabel, vehicleTitle } from './vehicle';

describe('veículo', () => {
  it('tem rótulo e porte para cada categoria', () => {
    for (const c of CATEGORIES) {
      expect(CATEGORY_INFO[c].label).toBeTruthy();
      expect(CATEGORY_INFO[c].size).toBeTruthy();
    }
    expect(categoryLabel('PICKUP')).toBe('Caminhonete');
  });

  it('monta o título do carro', () => {
    expect(vehicleTitle({ model: 'Onix', color: 'Prata', plate: 'ABC1D23' })).toBe('Onix Prata');
    expect(vehicleTitle({ model: '', plate: 'ABC1D23' })).toBe('Veículo');
  });
});
