import type { OsStatus, PaymentStatus } from './database.types';

/** Etapas mostradas ao cliente no acompanhamento ao vivo. */
export const TRACKER_STEPS: { status: OsStatus; label: string }[] = [
  { status: 'SCHEDULED', label: 'Agendado' },
  { status: 'WAITING', label: 'No pátio' },
  { status: 'WASHING', label: 'Lavando' },
  { status: 'FINISHING', label: 'Finalizando' },
  { status: 'READY', label: 'Pronto para retirada' },
];

export const STATUS_LABELS: Record<OsStatus, string> = {
  SCHEDULED: 'Agendado',
  WAITING: 'Aguardando',
  WASHING: 'Em lavagem',
  FINISHING: 'Acabamento',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'A pagar',
  PAID: 'Pago',
  REFUNDED: 'Estornado',
  CANCELED: 'Cancelado',
};

/** Colunas do Kanban do pátio. */
export const YARD_COLUMNS: OsStatus[] = ['WAITING', 'WASHING', 'FINISHING', 'READY'];

const FLOW: OsStatus[] = ['SCHEDULED', 'WAITING', 'WASHING', 'FINISHING', 'READY', 'DELIVERED'];

/** Próxima etapa do botão "avançar" (null no fim ou se cancelada). */
export function nextStatus(s: OsStatus): OsStatus | null {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

export function previousStatus(s: OsStatus): OsStatus | null {
  const i = FLOW.indexOf(s);
  return i > 0 && s !== 'DELIVERED' ? FLOW[i - 1] : null;
}

/** Índice da etapa no tracker (Entregue conta como a última; Cancelado = -1). */
export function trackerIndex(s: OsStatus): number {
  if (s === 'CANCELED') return -1;
  if (s === 'DELIVERED') return TRACKER_STEPS.length - 1;
  return TRACKER_STEPS.findIndex((t) => t.status === s);
}

/** Percentual da barra de progresso (0–100). */
export function trackerProgress(s: OsStatus): number {
  const i = trackerIndex(s);
  if (i < 0) return 0;
  return Math.round((i / (TRACKER_STEPS.length - 1)) * 100);
}

export function isActive(s: OsStatus): boolean {
  return s !== 'DELIVERED' && s !== 'CANCELED';
}
