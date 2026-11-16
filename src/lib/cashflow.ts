import type { CashEntry } from './database.types';

export const EXPENSE_CATEGORIES = ['Produtos (shampoo, cera...)', 'Água', 'Energia', 'Aluguel', 'Salários e comissões', 'Manutenção', 'Impostos', 'Outros'];

export interface CashSummary {
  income: number;
  expense: number;
  balance: number;
  byCategory: { category: string; type: CashEntry['type']; total: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Totais do fluxo de caixa no período e quebra por categoria (maiores primeiro). */
export function summarizeCash(entries: Pick<CashEntry, 'type' | 'amount' | 'category'>[]): CashSummary {
  let income = 0;
  let expense = 0;
  const cats = new Map<string, { category: string; type: CashEntry['type']; total: number }>();
  for (const e of entries) {
    const amount = Number(e.amount);
    if (e.type === 'INCOME') income += amount;
    else expense += amount;
    const key = `${e.type}:${e.category}`;
    const c = cats.get(key) ?? { category: e.category, type: e.type, total: 0 };
    c.total += amount;
    cats.set(key, c);
  }
  return {
    income: round(income),
    expense: round(expense),
    balance: round(income - expense),
    byCategory: [...cats.values()].map((c) => ({ ...c, total: round(c.total) })).sort((a, b) => b.total - a.total),
  };
}

/** Saldo acumulado dia a dia (para o gráfico do fluxo de caixa). */
export function runningBalance(entries: Pick<CashEntry, 'type' | 'amount' | 'occurred_on'>[]): { day: string; balance: number }[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const v = Number(e.amount) * (e.type === 'INCOME' ? 1 : -1);
    byDay.set(e.occurred_on, (byDay.get(e.occurred_on) ?? 0) + v);
  }
  let acc = 0;
  return [...byDay.keys()].sort().map((day) => {
    acc += byDay.get(day) ?? 0;
    return { day, balance: round(acc) };
  });
}
