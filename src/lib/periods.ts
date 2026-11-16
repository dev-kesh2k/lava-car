import { addDays, dateKeyInZone, weekdayOf } from './timezone';

export interface Period {
  from: string;
  to: string;
  label: string;
}

/** Hoje, no fuso da loja. */
export function today(timeZone: string, now = new Date()): Period {
  const d = dateKeyInZone(now, timeZone);
  return { from: d, to: d, label: 'Hoje' };
}

/** Mês corrente até hoje. */
export function monthToDate(timeZone: string, now = new Date()): Period {
  const d = dateKeyInZone(now, timeZone);
  return { from: `${d.slice(0, 8)}01`, to: d, label: 'Este mês' };
}

/** Semana de fechamento das comissões: segunda a domingo que contém a data. */
export function weekOf(dateKey: string): Period {
  const wd = weekdayOf(dateKey);
  const monday = addDays(dateKey, wd === 0 ? -6 : 1 - wd);
  return { from: monday, to: addDays(monday, 6), label: 'Semana' };
}

/** Semana anterior (fechamento que normalmente é pago). */
export function previousWeek(dateKey: string): Period {
  return { ...weekOf(addDays(weekOf(dateKey).from, -1)), label: 'Semana passada' };
}

export function formatPeriod(p: Period): string {
  const f = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  return p.from === p.to ? f(p.from) : `${f(p.from)} a ${f(p.to)}`;
}
