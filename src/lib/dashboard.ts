import type { DashboardSummary } from './database.types';

/** Participação de cada serviço no total vendido (para as barras de "mais vendidos"). */
export function topServicesShare(top: DashboardSummary['top_services']) {
  const max = Math.max(1, ...top.map((t) => Number(t.qty)));
  return top.map((t) => ({ ...t, qty: Number(t.qty), revenue: Number(t.revenue), width: Math.round((Number(t.qty) / max) * 100) }));
}

/** Variação percentual entre dois períodos (null se não houver base). */
export function variation(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Altura relativa das barras do faturamento diário. */
export function dailyBars(days: DashboardSummary['by_day']) {
  const max = Math.max(1, ...days.map((d) => Number(d.revenue)));
  return days.map((d) => ({ ...d, revenue: Number(d.revenue), height: Math.round((Number(d.revenue) / max) * 100) }));
}
