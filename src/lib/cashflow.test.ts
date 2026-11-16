import { describe, expect, it } from 'vitest';
import { runningBalance, summarizeCash } from './cashflow';

const entries = [
  { type: 'INCOME' as const, amount: 75, category: 'Serviços', occurred_on: '2026-01-12' },
  { type: 'INCOME' as const, amount: 80.1, category: 'Serviços', occurred_on: '2026-01-13' },
  { type: 'EXPENSE' as const, amount: 40.05, category: 'Água', occurred_on: '2026-01-12' },
  { type: 'EXPENSE' as const, amount: 120, category: 'Produtos (shampoo, cera...)', occurred_on: '2026-01-13' },
];

describe('fluxo de caixa', () => {
  it('soma entradas, saídas e saldo', () => {
    const s = summarizeCash(entries);
    expect(s.income).toBe(155.1);
    expect(s.expense).toBe(160.05);
    expect(s.balance).toBe(-4.95);
    expect(s.byCategory[0]).toEqual({ category: 'Serviços', type: 'INCOME', total: 155.1 });
  });

  it('calcula o saldo acumulado por dia', () => {
    expect(runningBalance(entries)).toEqual([
      { day: '2026-01-12', balance: 34.95 },
      { day: '2026-01-13', balance: -4.95 },
    ]);
  });

  it('período vazio dá zero', () => {
    expect(summarizeCash([])).toEqual({ income: 0, expense: 0, balance: 0, byCategory: [] });
  });
});
