import { ArrowRight, Camera, ClipboardCheck, Clock, Undo2 } from 'lucide-react';
import type { OsWithDetails } from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OsStatus } from '@/lib/database.types';
import { formatBRL, formatTime } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { nextStatus, PAYMENT_LABELS, previousStatus, STATUS_LABELS } from '@/lib/status';
import { cn } from '@/lib/utils';
import { CATEGORY_INFO } from '@/lib/vehicle';
import { minutesInStage } from './yard';
import { WhatsAppButton } from './WhatsAppButton';

const NEXT_LABEL: Partial<Record<OsStatus, string>> = {
  SCHEDULED: 'Chegou',
  WAITING: 'Começar lavagem',
  WASHING: 'Acabamento',
  FINISHING: 'Pronto',
  READY: 'Entregue',
};

interface Props {
  os: OsWithDetails;
  shopName: string;
  timeZone: string;
  busy: boolean;
  hasChecklist: boolean;
  onMove: (os: OsWithDetails, to: OsStatus) => void;
  onChecklist: (os: OsWithDetails) => void;
  onPaid: (os: OsWithDetails) => void;
}

/** Cartão do carro no Kanban: botões grandes para avançar sem precisar arrastar. */
export function OSCard({ os, shopName, timeZone, busy, hasChecklist, onMove, onChecklist, onPaid }: Props) {
  const next = nextStatus(os.status);
  const prev = previousStatus(os.status);
  const minutes = minutesInStage(os);
  const late = os.status !== 'READY' && minutes > os.duration_min;

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/os-id', os.id)}
      className={cn('space-y-3 rounded-lg border bg-card p-3 shadow-sm', os.status === 'READY' && 'border-success')}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xl font-bold tracking-wider">{os.vehicle ? formatPlate(os.vehicle.plate) : '—'}</p>
          <p className="text-sm text-muted-foreground">
            {[os.vehicle?.model, os.vehicle?.color].filter(Boolean).join(' · ') || 'Veículo'}
            {os.vehicle && ` · ${CATEGORY_INFO[os.vehicle.category].label}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">OS {os.number}</span>
          {os.origin === 'WALK_IN' && <Badge variant="outline">Avulso</Badge>}
        </div>
      </header>

      <p className="text-sm font-medium">{os.items.map((i) => i.name).join(' + ')}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">{os.customer_name || 'Cliente'}</span>
        <span className={cn('flex items-center gap-1', late ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
          <Clock className="h-3 w-3" />
          {os.status === 'SCHEDULED' ? formatTime(os.scheduled_at, timeZone) : `${minutes} min em ${STATUS_LABELS[os.status].toLowerCase()}`}
        </span>
        <button onClick={() => os.payment_status !== 'PAID' && onPaid(os)} className="ml-auto">
          <Badge variant={os.payment_status === 'PAID' ? 'success' : 'warning'}>
            {PAYMENT_LABELS[os.payment_status]} {formatBRL(os.total_amount)}
          </Badge>
        </button>
      </div>

      {os.status === 'WAITING' && !hasChecklist && (
        <Button variant="outline" size="lg" className="w-full" onClick={() => onChecklist(os)}>
          <Camera /> Fazer vistoria
        </Button>
      )}
      {hasChecklist && os.status !== 'SCHEDULED' && (
        <button className="flex items-center gap-1 text-xs text-success" onClick={() => onChecklist(os)}>
          <ClipboardCheck className="h-3.5 w-3.5" /> Vistoria feita
        </button>
      )}

      <div className="flex gap-2">
        {prev && prev !== 'SCHEDULED' && (
          <Button variant="ghost" size="lg" disabled={busy} onClick={() => onMove(os, prev)} aria-label={`Voltar para ${STATUS_LABELS[prev]}`}>
            <Undo2 />
          </Button>
        )}
        {os.status === 'READY' && <WhatsAppButton os={os} shopName={shopName} />}
        {next && (
          <Button size="lg" variant={next === 'READY' || next === 'DELIVERED' ? 'success' : 'default'} disabled={busy} className="flex-1" onClick={() => onMove(os, next)}>
            {NEXT_LABEL[os.status]} <ArrowRight />
          </Button>
        )}
      </div>
    </article>
  );
}
