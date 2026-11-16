import { describe, expect, it } from 'vitest';
import { formatBRL, formatDate, formatDuration, formatTime, parseMoney } from './format';

describe('format', () => {
  it('formata reais', () => {
    expect(formatBRL(75)).toBe('R$ 75,00');
    expect(formatBRL('1234.5')).toBe('R$ 1.234,50');
    expect(formatBRL(null)).toBe('R$ 0,00');
  });

  it('formata duração', () => {
    expect(formatDuration(40)).toBe('40 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(75)).toBe('1h15');
    expect(formatDuration(185)).toBe('3h05');
  });

  it('formata data e hora no fuso da loja', () => {
    expect(formatDate('2026-01-12T12:30:00Z')).toBe('12/01/2026');
    expect(formatTime('2026-01-12T12:30:00Z')).toBe('09:30');
  });

  it('lê valores digitados', () => {
    expect(parseMoney('350,50')).toBe(350.5);
    expect(parseMoney('350.50')).toBe(350.5);
    expect(parseMoney('1.234,56')).toBe(1234.56);
    expect(parseMoney('R$ 20')).toBe(20);
    expect(parseMoney('abc')).toBeNaN();
    expect(parseMoney('')).toBeNaN();
  });
});
