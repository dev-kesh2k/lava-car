/** Visão do cartão fidelidade em selos: quantos preenchidos, quantos faltam e se há prêmio. */
export function loyaltyView(card: { stamps: number; rewards_available: number } | null, goal: number) {
  const g = Math.max(1, goal);
  const stamps = Math.min(Math.max(0, card?.stamps ?? 0), g);
  return {
    goal: g,
    stamps,
    remaining: g - stamps,
    rewards: Math.max(0, card?.rewards_available ?? 0),
    slots: Array.from({ length: g }, (_, i) => i < stamps),
    percent: Math.round((stamps / g) * 100),
  };
}

export function loyaltyHeadline(v: ReturnType<typeof loyaltyView>): string {
  if (v.rewards > 0) return v.rewards === 1 ? 'Você tem 1 lavagem grátis!' : `Você tem ${v.rewards} lavagens grátis!`;
  if (v.remaining === 1) return 'Falta só 1 lavagem para ganhar a próxima!';
  return `Faltam ${v.remaining} lavagens para ganhar a próxima`;
}
