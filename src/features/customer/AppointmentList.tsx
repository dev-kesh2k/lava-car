import { CalendarClock } from 'lucide-react';
import type { OsWithDetails } from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBRL, formatDateTime } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/status';

/** Próximos agendamentos e histórico do cliente. */
export function AppointmentList({ items, timeZone, onCancel }: { items: OsWithDetails[]; timeZone: string; onCancel: (os: OsWithDetails) => void }) {
  if (!items.length) return null;
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {items.map((os) => (
        <li key={os.id} className="flex items-center gap-3 p-3">
          <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{os.items.map((i) => i.name).join(' + ') || 'Serviço'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(os.scheduled_at, timeZone)} · {os.vehicle?.model || os.vehicle?.plate} · {formatBRL(os.total_amount)}
            </p>
          </div>
          {os.status === 'SCHEDULED' ? (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onCancel(os)}>
              Cancelar
            </Button>
          ) : (
            <Badge variant={os.status === 'CANCELED' ? 'outline' : 'secondary'}>{STATUS_LABELS[os.status]}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
