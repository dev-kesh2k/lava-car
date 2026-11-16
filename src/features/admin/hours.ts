import type { OpeningHours } from '@/lib/database.types';
import { minutesOf } from '@/lib/timezone';

const DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Confere o horário antes de salvar: abertura antes do fechamento e pelo menos um dia aberto. */
export function validateOpeningHours(h: OpeningHours): string | null {
  let anyOpen = false;
  for (let i = 0; i < 7; i++) {
    const d = h[String(i)];
    if (!d) continue;
    anyOpen = true;
    if (!/^\d{2}:\d{2}$/.test(d.open) || !/^\d{2}:\d{2}$/.test(d.close)) return `Horário inválido na ${DAYS[i]}.`;
    if (minutesOf(d.close) <= minutesOf(d.open)) return `Na ${DAYS[i]} o fechamento precisa ser depois da abertura.`;
  }
  return anyOpen ? null : 'Abra pelo menos um dia da semana.';
}
