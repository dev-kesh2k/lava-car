import type { OpeningHours } from './database.types';
import { minutesOf, weekdayOf, zonedTimeToUtc } from './timezone';

export interface BusyInterval {
  starts_at: string;
  ends_at: string;
}

export interface Slot {
  /** Início em UTC (ISO), pronto para mandar ao book_appointment. */
  start: string;
  /** "09:30" no horário da loja. */
  label: string;
  available: boolean;
  /** Boxes livres no pior momento do intervalo. */
  freeBoxes: number;
}

export interface SlotOptions {
  dateKey: string;
  timeZone: string;
  openingHours: OpeningHours;
  intervalMin: number;
  capacity: number;
  durationMin: number;
  busy: BusyInterval[];
  now?: Date;
  /** Antecedência mínima para agendar (padrão 30 min). */
  leadMin?: number;
}

/**
 * Maior número de carros ao mesmo tempo dentro de [start, end).
 * A lotação só aumenta quando uma OS começa, então basta olhar o início do intervalo
 * e o início de cada OS que cai dentro dele.
 */
export function peakOverlap(busy: { start: number; end: number }[], start: number, end: number): number {
  const inside = busy.filter((b) => b.start < end && b.end > start);
  const points = [start, ...inside.map((b) => b.start).filter((t) => t > start)];
  let peak = 0;
  for (const p of points) {
    const count = inside.filter((b) => b.start <= p && b.end > p).length;
    if (count > peak) peak = count;
  }
  return peak;
}

/**
 * Grade de horários de um dia: cruza a duração do serviço com a capacidade de boxes simultâneos.
 * O banco refaz a mesma conta (os_peak_overlap) com trava, então isto é só para a tela.
 */
export function buildSlots(o: SlotOptions): Slot[] {
  const hours = o.openingHours[String(weekdayOf(o.dateKey))];
  if (!hours || o.durationMin <= 0 || o.intervalMin <= 0) return [];
  const open = minutesOf(hours.open);
  const close = minutesOf(hours.close);
  const busy = o.busy.map((b) => ({ start: Date.parse(b.starts_at), end: Date.parse(b.ends_at) }));
  const earliest = (o.now ?? new Date()).getTime() + (o.leadMin ?? 30) * 60_000;
  const slots: Slot[] = [];
  for (let m = open; m + o.durationMin <= close; m += o.intervalMin) {
    const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const start = zonedTimeToUtc(o.dateKey, label, o.timeZone).getTime();
    const end = start + o.durationMin * 60_000;
    const peak = peakOverlap(busy, start, end);
    const freeBoxes = Math.max(0, o.capacity - peak);
    slots.push({ start: new Date(start).toISOString(), label, available: start >= earliest && freeBoxes > 0, freeBoxes });
  }
  return slots;
}

/** Primeiro horário livre (para o atalho "o mais cedo possível"). */
export function firstAvailable(slots: Slot[]): Slot | null {
  return slots.find((s) => s.available) ?? null;
}
