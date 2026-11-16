import { describe, expect, it } from 'vitest';
import { dailyBars, topServicesShare, variation } from './dashboard';

describe('painel gerencial', () => {
  it('proporção dos mais vendidos', () => {
    const r = topServicesShare([
      { name: 'Completa', qty: 10, revenue: 600 },
      { name: 'Cera', qty: 5, revenue: 100 },
    ]);
    expect(r.map((x) => x.width)).toEqual([100, 50]);
  });

  it('variação entre períodos', () => {
    expect(variation(120, 100)).toBe(20);
    expect(variation(50, 200)).toBe(-75);
    expect(variation(10, 0)).toBeNull();
  });

  it('barras do faturamento diário', () => {
    expect(dailyBars([{ day: 'a', revenue: 50, cars: 1 }, { day: 'b', revenue: 200, cars: 3 }]).map((d) => d.height)).toEqual([25, 100]);
    expect(dailyBars([{ day: 'a', revenue: 0, cars: 0 }])[0].height).toBe(0);
  });
});
