import { describe, expect, it } from 'vitest';
import { formatPhoneBR, normalizePhoneBR, toE164 } from './phone';

describe('telefone', () => {
  it('aceita com ou sem DDI', () => {
    expect(normalizePhoneBR('(45) 99999-0000')).toBe('5545999990000');
    expect(normalizePhoneBR('+55 45 9999-0000')).toBe('554599990000');
    expect(normalizePhoneBR('0055 45 999990000')).toBe('5545999990000');
  });

  it('recusa números incompletos', () => {
    expect(normalizePhoneBR('9999-0000')).toBeNull();
    expect(normalizePhoneBR('')).toBeNull();
  });

  it('formata e gera E.164', () => {
    expect(formatPhoneBR('45999990000')).toBe('+55 (45) 99999-0000');
    expect(formatPhoneBR('4599990000')).toBe('+55 (45) 9999-0000');
    expect(toE164('45 99999 0000')).toBe('+5545999990000');
  });
});
