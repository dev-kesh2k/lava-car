import { describe, expect, it } from 'vitest';
import type { OsWithDetails } from '@/api/appointments';
import { applyYardChange, groupYard, minutesInStage } from './yard';

const os = (id: string, status: OsWithDetails['status'], scheduled_at = '2026-01-12T12:00:00Z') =>
  ({ id, status, scheduled_at, started_at: null, updated_at: scheduled_at, items: [], vehicle: null }) as unknown as OsWithDetails;

describe('quadro do pátio', () => {
  it('separa colunas e quem está chegando', () => {
    const g = groupYard([
      os('1', 'WASHING'),
      os('2', 'SCHEDULED'),
      os('3', 'WAITING', '2026-01-12T13:00:00Z'),
      os('4', 'WAITING', '2026-01-12T11:00:00Z'),
      os('5', 'DELIVERED'),
    ]);
    expect(g.columns.WAITING.map((o) => o.id)).toEqual(['4', '3']);
    expect(g.columns.WASHING.map((o) => o.id)).toEqual(['1']);
    expect(g.arriving.map((o) => o.id)).toEqual(['2']);
    expect(Object.values(g.columns).flat()).toHaveLength(3);
  });

  it('atualiza a lista com eventos do Realtime', () => {
    const list = [os('1', 'WAITING'), os('2', 'READY')];
    expect(applyYardChange(list, os('1', 'WASHING')).find((o) => o.id === '1')?.status).toBe('WASHING');
    expect(applyYardChange(list, os('2', 'DELIVERED')).map((o) => o.id)).toEqual(['1']);
    expect(applyYardChange(list, os('9', 'WAITING'))).toHaveLength(3);
  });

  it('conta o tempo na etapa', () => {
    const o = { status: 'WASHING' as const, started_at: '2026-01-12T12:00:00Z', updated_at: '2026-01-12T12:30:00Z' };
    expect(minutesInStage(o, Date.parse('2026-01-12T12:45:00Z'))).toBe(45);
    expect(minutesInStage({ ...o, status: 'READY' }, Date.parse('2026-01-12T12:45:00Z'))).toBe(15);
  });
});
