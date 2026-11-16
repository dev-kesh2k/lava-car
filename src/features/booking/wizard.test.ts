import { describe, expect, it } from 'vitest';
import { canAdvance, initialWizard, wizardReducer } from './wizard';

describe('wizard de agendamento', () => {
  it('só avança com o passo preenchido', () => {
    expect(canAdvance(0, initialWizard)).toBe(false);
    const s = wizardReducer(initialWizard, { type: 'vehicle', id: 'v1' });
    expect(canAdvance(0, s)).toBe(true);
    expect(canAdvance(1, s)).toBe(false);
    expect(canAdvance(1, wizardReducer(s, { type: 'main', id: 'm1' }))).toBe(true);
  });

  it('trocar de carro limpa serviços e horário', () => {
    let s = wizardReducer(initialWizard, { type: 'vehicle', id: 'v1' });
    s = wizardReducer(s, { type: 'main', id: 'm1' });
    s = wizardReducer(s, { type: 'toggleAddon', id: 'a1' });
    s = wizardReducer(s, { type: 'slot', start: '2026-01-12T12:00:00Z' });
    const other = wizardReducer(s, { type: 'vehicle', id: 'v2' });
    expect(other).toMatchObject({ vehicleId: 'v2', mainId: null, addonIds: [], slotStart: null });
    expect(wizardReducer(s, { type: 'vehicle', id: 'v1' })).toBe(s);
  });

  it('adicional liga e desliga e limpa o horário', () => {
    let s = wizardReducer({ ...initialWizard, slotStart: 'x' }, { type: 'toggleAddon', id: 'a1' });
    expect(s.addonIds).toEqual(['a1']);
    expect(s.slotStart).toBeNull();
    s = wizardReducer(s, { type: 'toggleAddon', id: 'a1' });
    expect(s.addonIds).toEqual([]);
  });

  it('limita o tamanho da observação', () => {
    expect(wizardReducer(initialWizard, { type: 'notes', text: 'x'.repeat(500) }).notes).toHaveLength(300);
  });
});
