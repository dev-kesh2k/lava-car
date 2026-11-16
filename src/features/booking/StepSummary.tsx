import { QrCode, Store } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { PaymentMethod, Tenant, Vehicle } from '@/lib/database.types';
import { formatBRL, formatDateTime, formatDuration } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import type { Quote } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { vehicleTitle } from '@/lib/vehicle';

/** Passo 4: resumo do pedido e forma de pagamento. */
export function StepSummary({
  tenant,
  vehicle,
  quote,
  slotStart,
  payment,
  notes,
  onPayment,
  onNotes,
}: {
  tenant: Tenant;
  vehicle: Vehicle;
  quote: Quote;
  slotStart: string;
  payment: PaymentMethod;
  notes: string;
  onPayment: (m: PaymentMethod) => void;
  onNotes: (t: string) => void;
}) {
  const options: { method: PaymentMethod; title: string; text: string; icon: typeof Store; disabled?: boolean }[] = [
    { method: 'ON_SITE', title: 'Pagar no local', text: 'Dinheiro, cartão ou Pix na retirada', icon: Store },
    { method: 'PIX', title: 'Pix antecipado', text: tenant.pix_enabled ? 'QR Code na hora, confirmação automática' : 'Esta loja ainda não aceita', icon: QrCode, disabled: !tenant.pix_enabled },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Carro</p>
          <p className="font-semibold">
            {vehicleTitle(vehicle)} · <span className="font-mono">{formatPlate(vehicle.plate)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Quando</p>
          <p className="font-semibold">
            {formatDateTime(slotStart, tenant.timezone)} · {formatDuration(quote.durationMin)}
          </p>
        </div>
        <ul className="space-y-1 border-t pt-3 text-sm">
          {quote.items.map((i) => (
            <li key={i.serviceId} className="flex justify-between">
              <span>{i.name}</span>
              <span>{formatBRL(i.price)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatBRL(quote.total)}</span>
          </li>
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pagamento">
        {options.map((o) => (
          <button
            key={o.method}
            type="button"
            role="radio"
            aria-checked={payment === o.method}
            disabled={o.disabled}
            onClick={() => onPayment(o.method)}
            className={cn('flex items-center gap-3 rounded-lg border-2 p-4 text-left disabled:opacity-50', payment === o.method ? 'border-primary bg-primary/5' : 'border-border')}
          >
            <o.icon className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">{o.title}</p>
              <p className="text-xs text-muted-foreground">{o.text}</p>
            </div>
          </button>
        ))}
      </div>

      <Textarea placeholder="Observação para a equipe (opcional)" value={notes} onChange={(e) => onNotes(e.target.value)} rows={2} />
    </div>
  );
}
