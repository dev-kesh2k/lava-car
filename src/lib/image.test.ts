import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('redução das fotos', () => {
  it('mantém foto pequena como está', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('reduz pelo lado maior mantendo a proporção', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});
