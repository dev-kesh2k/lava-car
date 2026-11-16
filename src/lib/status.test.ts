import { describe, expect, it } from 'vitest';
import { isActive, nextStatus, previousStatus, trackerIndex, trackerProgress, YARD_COLUMNS } from './status';

describe('status da OS', () => {
  it('avança na ordem do pátio', () => {
    expect(nextStatus('SCHEDULED')).toBe('WAITING');
    expect(nextStatus('WAITING')).toBe('WASHING');
    expect(nextStatus('FINISHING')).toBe('READY');
    expect(nextStatus('READY')).toBe('DELIVERED');
    expect(nextStatus('DELIVERED')).toBeNull();
    expect(nextStatus('CANCELED')).toBeNull();
  });

  it('volta uma etapa, menos depois de entregue', () => {
    expect(previousStatus('WASHING')).toBe('WAITING');
    expect(previousStatus('SCHEDULED')).toBeNull();
    expect(previousStatus('DELIVERED')).toBeNull();
  });

  it('calcula o progresso do tracker', () => {
    expect(trackerProgress('SCHEDULED')).toBe(0);
    expect(trackerProgress('WASHING')).toBe(50);
    expect(trackerProgress('READY')).toBe(100);
    expect(trackerProgress('DELIVERED')).toBe(100);
    expect(trackerIndex('CANCELED')).toBe(-1);
  });

  it('o Kanban tem as quatro colunas do pátio', () => {
    expect(YARD_COLUMNS).toEqual(['WAITING', 'WASHING', 'FINISHING', 'READY']);
    expect(isActive('READY')).toBe(true);
    expect(isActive('DELIVERED')).toBe(false);
  });
});
