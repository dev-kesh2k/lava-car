import { describe, expect, it } from 'vitest';
import { buildPriceMatrix, priceFor, quote, servicesForCategory } from './pricing';

const services = [
  { id: 'completa', name: 'Lavagem Completa', duration_min: 60, active: true },
  { id: 'cera', name: 'Cera Líquida', duration_min: 15, active: true },
  { id: 'couro', name: 'Hidratação de Couro', duration_min: 40, active: true },
  { id: 'velho', name: 'Polimento', duration_min: 90, active: false },
];
const matrix = buildPriceMatrix([
  { service_id: 'completa', category: 'HATCH', price: 55 },
  { service_id: 'completa', category: 'SUV', price: 80 },
  { service_id: 'cera', category: 'HATCH', price: 20 },
  { service_id: 'cera', category: 'SUV', price: 30 },
  { service_id: 'couro', category: 'SUV', price: 90 },
  { service_id: 'velho', category: 'SUV', price: 200 },
]);

describe('preços por porte', () => {
  it('lê a matriz', () => {
    expect(priceFor(matrix, 'completa', 'SUV')).toBe(80);
    expect(priceFor(matrix, 'couro', 'HATCH')).toBeNull();
  });

  it('esconde serviços sem preço para o porte ou inativos', () => {
    expect(servicesForCategory(services, matrix, 'HATCH').map((s) => s.id)).toEqual(['completa', 'cera']);
    expect(servicesForCategory(services, matrix, 'SUV').map((s) => s.id)).toEqual(['completa', 'cera', 'couro']);
  });

  it('soma preço e duração do principal com adicionais', () => {
    const q = quote(services, matrix, 'SUV', 'completa', ['cera', 'couro']);
    expect(q.total).toBe(200);
    expect(q.durationMin).toBe(115);
    expect(q.items.map((i) => i.name)).toEqual(['Lavagem Completa', 'Cera Líquida', 'Hidratação de Couro']);
  });

  it('ignora adicional repetido, sem preço ou sem principal', () => {
    expect(quote(services, matrix, 'HATCH', 'completa', ['cera', 'cera', 'couro']).total).toBe(75);
    expect(quote(services, matrix, 'HATCH', null, ['cera']).items).toEqual([]);
  });
});
