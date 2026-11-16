import { describe, expect, it } from 'vitest';
import { formatPlate, isMercosulPlate, isValidPlate, normalizePlate } from './plate';

describe('placa', () => {
  it('normaliza o que o operador digita', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23');
    expect(normalizePlate(' xyz 9876 ')).toBe('XYZ9876');
  });

  it('valida padrão antigo e Mercosul', () => {
    expect(isValidPlate('ABC1234')).toBe(true);
    expect(isValidPlate('abc1d23')).toBe(true);
    expect(isValidPlate('AB12345')).toBe(false);
    expect(isValidPlate('ABC12')).toBe(false);
    expect(isMercosulPlate('ABC1D23')).toBe(true);
    expect(isMercosulPlate('ABC1234')).toBe(false);
  });

  it('formata para exibição', () => {
    expect(formatPlate('abc1234')).toBe('ABC-1234');
    expect(formatPlate('abc1d23')).toBe('ABC1D23');
  });
});
