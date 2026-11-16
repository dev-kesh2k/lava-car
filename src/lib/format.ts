// Formatação em pt-BR (moeda, datas e durações).
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return brl.format(Number.isFinite(n) ? n : 0).replace(/\u00a0/g, ' ');
}

/** 75 → "1h15", 60 → "1h", 40 → "40 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h${String(rest).padStart(2, '0')}` : `${h}h`;
}

export function formatDate(iso: string | Date, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).format(new Date(iso));
}

export function formatTime(iso: string | Date, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** "seg., 12/01 às 09:30" */
export function formatDateTime(iso: string | Date, timeZone = 'America/Sao_Paulo'): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone }).format(d);
  return `${day} às ${formatTime(d, timeZone)}`;
}

/** Converte "350,50", "350.50" ou "1.234,56" para número (NaN se inválido). */
export function parseMoney(input: string): number {
  const s = input.trim().replace(/[R$\s]/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
}
