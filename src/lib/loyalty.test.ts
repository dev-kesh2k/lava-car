import { describe, expect, it } from 'vitest';
import { loyaltyHeadline, loyaltyView } from './loyalty';

describe('cartão fidelidade', () => {
  it('mostra selos preenchidos e restantes', () => {
    const v = loyaltyView({ stamps: 3, rewards_available: 0 }, 10);
    expect(v.slots.filter(Boolean)).toHaveLength(3);
    expect(v.remaining).toBe(7);
    expect(v.percent).toBe(30);
    expect(loyaltyHeadline(v)).toBe('Faltam 7 lavagens para ganhar a próxima');
  });

  it('cliente sem cartão começa do zero', () => {
    const v = loyaltyView(null, 5);
    expect(v.stamps).toBe(0);
    expect(v.slots).toEqual([false, false, false, false, false]);
  });

  it('avisa prêmio e última lavagem', () => {
    expect(loyaltyHeadline(loyaltyView({ stamps: 9, rewards_available: 0 }, 10))).toBe('Falta só 1 lavagem para ganhar a próxima!');
    expect(loyaltyHeadline(loyaltyView({ stamps: 0, rewards_available: 2 }, 10))).toBe('Você tem 2 lavagens grátis!');
  });

  it('não passa da meta mesmo com dado inconsistente', () => {
    expect(loyaltyView({ stamps: 15, rewards_available: 0 }, 10).stamps).toBe(10);
  });
});
