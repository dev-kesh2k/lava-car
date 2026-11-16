import { describe, expect, it } from 'vitest';
import { buildSlots, firstAvailable, peakOverlap } from './availability';
import type { OpeningHours } from './database.types';

const hours: OpeningHours = { '0': null, '1': { open: '08:00', close: '12:00' } };
const base = {
  dateKey: '2026-01-12', // segunda
  timeZone: 'America/Sao_Paulo',
  openingHours: hours,
  intervalMin: 30,
  now: new Date('2026-01-01T00:00:00Z'),
};
// 08:00 local = 11:00Z
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 0, 12, h + 3, m)).toISOString();

describe('pico de ocupação', () => {
  it('conta só quem está ao mesmo tempo', () => {
    const busy = [
      { start: 0, end: 60 },
      { start: 60, end: 120 },
      { start: 30, end: 90 },
    ];
    expect(peakOverlap(busy, 0, 120)).toBe(2);
    expect(peakOverlap(busy, 120, 180)).toBe(0);
    expect(peakOverlap(busy, 0, 30)).toBe(1);
  });
});

describe('grade de horários', () => {
  it('oferece horários que cabem antes de fechar', () => {
    const slots = buildSlots({ ...base, capacity: 1, durationMin: 60, busy: [] });
    expect(slots.map((s) => s.label)).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(slots.every((s) => s.available)).toBe(true);
    expect(slots[0].start).toBe(at(8));
  });

  it('dia fechado não tem horários', () => {
    expect(buildSlots({ ...base, dateKey: '2026-01-11', capacity: 2, durationMin: 30, busy: [] })).toEqual([]);
  });

  it('bloqueia quando todos os boxes estão ocupados em algum momento do serviço', () => {
    const busy = [
      { starts_at: at(9), ends_at: at(10) },
      { starts_at: at(9, 30), ends_at: at(10, 30) },
    ];
    const slots = buildSlots({ ...base, capacity: 2, durationMin: 60, busy });
    const byLabel = Object.fromEntries(slots.map((s) => [s.label, s]));
    expect(byLabel['08:00'].available).toBe(true);
    // 08:30–09:30 só pega a OS das 09:00 (a das 09:30 começa quando esta termina).
    expect(byLabel['08:30'].available).toBe(true);
    expect(byLabel['08:30'].freeBoxes).toBe(1);
    expect(byLabel['09:00'].available).toBe(false);
    expect(byLabel['09:30'].available).toBe(false);
    // 10:00–11:00: só a das 09:30 ainda está lá.
    expect(byLabel['10:00'].available).toBe(true);
    expect(byLabel['10:00'].freeBoxes).toBe(1);
    expect(byLabel['10:30'].freeBoxes).toBe(2);
  });

  it('respeita a antecedência mínima', () => {
    const slots = buildSlots({ ...base, now: new Date(at(9)), capacity: 1, durationMin: 30, busy: [] });
    expect(firstAvailable(slots)?.label).toBe('09:30');
    expect(slots.find((s) => s.label === '09:00')?.available).toBe(false);
  });

  it('serviço longo demais não cabe no dia', () => {
    expect(buildSlots({ ...base, capacity: 3, durationMin: 300, busy: [] })).toEqual([]);
  });
});
