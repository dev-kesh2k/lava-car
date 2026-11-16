import { describe, expect, it } from 'vitest';
import { formatPeriod, monthToDate, previousWeek, today, weekOf } from './periods';

const now = new Date('2026-01-15T02:00:00Z'); // 14/01 23h em São Paulo

describe('períodos', () => {
  it('hoje e mês usam o fuso da loja', () => {
    expect(today('America/Sao_Paulo', now)).toMatchObject({ from: '2026-01-14', to: '2026-01-14' });
    expect(monthToDate('America/Sao_Paulo', now)).toMatchObject({ from: '2026-01-01', to: '2026-01-14' });
  });

  it('semana vai de segunda a domingo', () => {
    expect(weekOf('2026-01-14')).toMatchObject({ from: '2026-01-12', to: '2026-01-18' });
    expect(weekOf('2026-01-18')).toMatchObject({ from: '2026-01-12', to: '2026-01-18' });
    expect(weekOf('2026-01-12')).toMatchObject({ from: '2026-01-12', to: '2026-01-18' });
    expect(previousWeek('2026-01-14')).toMatchObject({ from: '2026-01-05', to: '2026-01-11' });
  });

  it('formata o período', () => {
    expect(formatPeriod({ from: '2026-01-12', to: '2026-01-18', label: '' })).toBe('12/01 a 18/01');
    expect(formatPeriod({ from: '2026-01-12', to: '2026-01-12', label: '' })).toBe('12/01');
  });
});
