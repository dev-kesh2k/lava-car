import { describe, expect, it } from 'vitest';
import { commissionOf, commissionReceipt, commissionTotals } from './commission';

describe('comissões', () => {
  it('calcula o percentual sobre o valor', () => {
    expect(commissionOf(75, 30)).toBe(22.5);
    expect(commissionOf(33.33, 12.5)).toBe(4.17);
    expect(commissionOf(100, 0)).toBe(0);
  });

  it('soma o fechamento da equipe', () => {
    expect(
      commissionTotals([
        { os_count: 3, gross: 200, commission: 60 },
        { os_count: 1, gross: 55.5, commission: 11.1 },
      ]),
    ).toEqual({ osCount: 4, gross: 255.5, commission: 71.1 });
  });

  it('gera o texto do recibo', () => {
    const t = commissionReceipt({ full_name: 'Carlos', commission_pct: 30, os_count: 2, gross: 130, commission: 39 }, '12/01 a 18/01');
    expect(t).toContain('Fechamento 12/01 a 18/01');
    expect(t).toContain('Comissão 30%: R$ 39,00');
  });
});
