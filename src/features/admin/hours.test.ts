import { describe, expect, it } from 'vitest';
import { validateOpeningHours } from './hours';

describe('horário de funcionamento', () => {
  it('aceita horário normal', () => {
    expect(validateOpeningHours({ '1': { open: '08:00', close: '18:00' }, '0': null })).toBeNull();
  });

  it('recusa fechamento antes da abertura', () => {
    expect(validateOpeningHours({ '6': { open: '13:00', close: '08:00' } })).toMatch(/sábado/);
  });

  it('recusa semana toda fechada', () => {
    expect(validateOpeningHours({ '0': null })).toMatch(/pelo menos um dia/);
  });
});
