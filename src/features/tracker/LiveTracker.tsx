import { MapPin } from 'lucide-react';
import type { OsWithDetails } from '@/api/appointments';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL, formatDateTime } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { PAYMENT_LABELS } from '@/lib/status';
import { vehicleTitle } from '@/lib/vehicle';
import { StatusProgress } from './StatusProgress';

/** Acompanhamento ao vivo de uma OS (atualizado pelo Realtime na tela inicial). */
export function LiveTracker({ os, timeZone, address }: { os: OsWithDetails; timeZone: string; address?: string | null }) {
  const ready = os.status === 'READY';
  return (
    <Card className={ready ? 'border-success shadow-success/20' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{os.vehicle ? vehicleTitle(os.vehicle) : 'Seu carro'}</CardTitle>
            <p className="font-mono text-sm text-muted-foreground">{os.vehicle && formatPlate(os.vehicle.plate)}</p>
          </div>
          <Badge variant={os.payment_status === 'PAID' ? 'success' : 'outline'}>{PAYMENT_LABELS[os.payment_status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusProgress status={os.status} />
        {ready ? (
          <p className="rounded-md bg-success/10 p-3 text-center font-semibold text-success">Seu carro está limpo e pronto para retirada!</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {os.status === 'SCHEDULED' ? `Agendado para ${formatDateTime(os.scheduled_at, timeZone)}` : 'Seu carro está com a gente.'}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span>{os.items.map((i) => i.name).join(' + ')}</span>
          <span className="font-semibold">{formatBRL(os.total_amount)}</span>
        </div>
        {address && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {address}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
