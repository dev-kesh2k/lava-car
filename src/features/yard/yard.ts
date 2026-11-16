import type { OsWithDetails } from '@/api/appointments';
import type { OsStatus } from '@/lib/database.types';
import { YARD_COLUMNS } from '@/lib/status';

/** Distribui as OS nas colunas do pátio; agendados de hoje ficam numa faixa à parte ("chegando"). */
export function groupYard(list: OsWithDetails[]) {
  const columns = Object.fromEntries(YARD_COLUMNS.map((s) => [s, [] as OsWithDetails[]])) as Record<OsStatus, OsWithDetails[]>;
  const arriving: OsWithDetails[] = [];
  for (const os of list) {
    if (os.status === 'SCHEDULED') arriving.push(os);
    else if (columns[os.status]) columns[os.status].push(os);
  }
  const byTime = (a: OsWithDetails, b: OsWithDetails) => a.scheduled_at.localeCompare(b.scheduled_at);
  for (const s of YARD_COLUMNS) columns[s].sort(byTime);
  arriving.sort(byTime);
  return { columns, arriving };
}

/** Aplica uma mudança do Realtime na lista local (insere, troca ou remove quem saiu do pátio). */
export function applyYardChange(list: OsWithDetails[], fresh: OsWithDetails): OsWithDetails[] {
  const others = list.filter((o) => o.id !== fresh.id);
  const visible = YARD_COLUMNS.includes(fresh.status) || fresh.status === 'SCHEDULED';
  return visible ? [...others, fresh] : others;
}

/** Minutos desde que o carro entrou na etapa atual (para destacar carros parados há muito tempo). */
export function minutesInStage(os: Pick<OsWithDetails, 'status' | 'started_at' | 'updated_at'>, now = Date.now()): number {
  const since = os.status === 'WASHING' && os.started_at ? os.started_at : os.updated_at;
  return Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
}
