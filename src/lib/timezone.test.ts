import { describe, expect, it } from 'vitest';
import { addDays, dateKeyInZone, minutesOf, weekdayOf, zonedTimeToUtc } from './timezone';

describe('fuso horário', () => {
  it('converte horário local de São Paulo para UTC', () => {
    expect(zonedTimeToUtc('2026-01-12', '09:30', 'America/Sao_Paulo').toISOString()).toBe('2026-01-12T12:30:00.000Z');
    expect(zonedTimeToUtc('2026-07-01', '18:00', 'America/Manaus').toISOString()).toBe('2026-07-01T22:00:00.000Z');
  });

  it('respeita horário de verão em outros fusos', () => {
    expect(zonedTimeToUtc('2026-07-01', '08:00', 'Europe/Lisbon').toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(zonedTimeToUtc('2026-01-01', '08:00', 'Europe/Lisbon').toISOString()).toBe('2026-01-01T08:00:00.000Z');
  });

  it('acha a data local de um instante', () => {
    expect(dateKeyInZone(new Date('2026-01-13T02:00:00Z'), 'America/Sao_Paulo')).toBe('2026-01-12');
  });

  it('soma dias e acha o dia da semana', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-01-12')).toBe(1);
    expect(weekdayOf('2026-01-11')).toBe(0);
    expect(minutesOf('08:30')).toBe(510);
  });
});
