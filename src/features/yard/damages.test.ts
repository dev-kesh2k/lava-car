import { describe, expect, it } from 'vitest';
import { describeDamages, toggleDamage } from './damages';

describe('avarias da vistoria', () => {
  it('marca e desmarca', () => {
    let list = toggleDamage([], 'FRONT', 'SCRATCH');
    list = toggleDamage(list, 'FRONT', 'DENT');
    expect(list).toHaveLength(2);
    list = toggleDamage(list, 'FRONT', 'SCRATCH');
    expect(list).toEqual([{ area: 'FRONT', type: 'DENT' }]);
  });

  it('resume por área na ordem do carro', () => {
    expect(describeDamages([])).toBe('Sem avarias');
    expect(
      describeDamages([
        { area: 'ROOF', type: 'STAIN' },
        { area: 'FRONT', type: 'SCRATCH' },
        { area: 'FRONT', type: 'DENT' },
      ]),
    ).toBe('Frente: risco, amassado · Teto: mancha');
  });
});
