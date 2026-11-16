import { CalendarX } from 'lucide-react';
import { useMemo } from 'react';
import { getBusyIntervals } from '@/api/appointments';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { buildSlots } from '@/lib/availability';
import type { Tenant } from '@/lib/database.types';
import { addDays, dateKeyInZone, weekdayOf, zonedTimeToUtc } from '@/lib/timezone';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Próximos dias em que a loja abre (até 14). */
function openDays(tenant: Tenant, from: string, count = 14): string[] {
  const days: string[] = [];
  for (let i = 0; i < 21 && days.length < count; i++) {
    const d = addDays(from, i);
    if (tenant.opening_hours[String(weekdayOf(d))]) days.push(d);
  }
  return days;
}

/** Passo 3: data e horário. Só aparecem horários em que o serviço inteiro cabe com box livre. */
export function StepSchedule({
  tenant,
  durationMin,
  dateKey,
  slotStart,
  onDate,
  onSlot,
}: {
  tenant: Tenant;
  durationMin: number;
  dateKey: string | null;
  slotStart: string | null;
  onDate: (d: string) => void;
  onSlot: (start: string) => void;
}) {
  const today = dateKeyInZone(new Date(), tenant.timezone);
  const days = useMemo(() => openDays(tenant, today), [tenant, today]);
  const selected = dateKey ?? days[0] ?? null;

  const busy = useAsync(async () => {
    if (!selected) return [];
    const from = zonedTimeToUtc(selected, '00:00', tenant.timezone);
    return getBusyIntervals(from, new Date(from.getTime() + 86_400_000));
  }, [selected, tenant.timezone]);

  const slots = useMemo(
    () =>
      selected
        ? buildSlots({
            dateKey: selected,
            timeZone: tenant.timezone,
            openingHours: tenant.opening_hours,
            intervalMin: tenant.slot_interval_min,
            capacity: tenant.box_capacity,
            durationMin,
            busy: busy.data ?? [],
          })
        : [],
    [selected, tenant, durationMin, busy.data],
  );
  const free = slots.filter((s) => s.available);

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Data">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === selected}
            onClick={() => onDate(d)}
            className={cn('flex min-w-[4rem] flex-col items-center rounded-lg border-2 px-3 py-2', d === selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}
          >
            <span className="text-xs uppercase">{d === today ? 'hoje' : WEEKDAYS[weekdayOf(d)]}</span>
            <span className="text-lg font-bold">{d.slice(8, 10)}</span>
            <span className="text-[10px] opacity-80">{d.slice(5, 7)}</span>
          </button>
        ))}
      </div>

      {busy.error && <Alert kind="error">{busy.error}</Alert>}
      {busy.loading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : free.length ? (
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Horário">
          {slots.map((s) => (
            <button
              key={s.start}
              type="button"
              role="radio"
              aria-checked={slotStart === s.start}
              disabled={!s.available}
              onClick={() => onSlot(s.start)}
              className={cn(
                'h-12 rounded-lg border-2 text-sm font-semibold transition disabled:border-dashed disabled:text-muted-foreground/50 disabled:line-through',
                slotStart === s.start ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <CalendarX className="h-8 w-8" />
          <p>Sem horários livres neste dia. Tente outra data.</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        A loja atende {tenant.box_capacity} {tenant.box_capacity === 1 ? 'carro' : 'carros'} ao mesmo tempo. Horários riscados já estão lotados.
      </p>
    </div>
  );
}
