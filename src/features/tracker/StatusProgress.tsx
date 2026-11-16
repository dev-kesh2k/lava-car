import { Car, CheckCircle2, Clock, Droplets, Sparkles } from 'lucide-react';
import type { OsStatus } from '@/lib/database.types';
import { TRACKER_STEPS, trackerIndex, trackerProgress } from '@/lib/status';
import { cn } from '@/lib/utils';

const ICONS = [Clock, Car, Droplets, Sparkles, CheckCircle2];

/** Barra de progresso: Agendado ➔ No pátio ➔ Lavando ➔ Finalizando ➔ Pronto para retirada. */
export function StatusProgress({ status }: { status: OsStatus }) {
  const current = trackerIndex(status);
  return (
    <div className="relative" aria-label={`Etapa: ${TRACKER_STEPS[current]?.label ?? 'Cancelado'}`}>
      <div className="absolute left-[10%] right-[10%] top-5 h-1 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${trackerProgress(status)}%` }} />
      </div>
      <ol className="relative grid grid-cols-5">
        {TRACKER_STEPS.map((step, i) => {
          const Icon = ICONS[i];
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.status} className="flex flex-col items-center gap-1 text-center">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary ring-4 ring-primary/20',
                  active && step.status === 'WASHING' && 'animate-pulse',
                  !done && !active && 'border-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn('text-[11px] leading-tight', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
