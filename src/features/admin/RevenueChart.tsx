import type { DashboardSummary } from '@/lib/database.types';
import { dailyBars } from '@/lib/dashboard';
import { formatBRL } from '@/lib/format';

/** Faturamento por dia em barras (sem biblioteca de gráfico, leve no celular). */
export function RevenueChart({ days }: { days: DashboardSummary['by_day'] }) {
  const bars = dailyBars(days);
  if (!bars.length) return null;
  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Faturamento por dia">
        {bars.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t bg-primary/80 transition group-hover:bg-primary" style={{ height: `${Math.max(d.height, d.revenue ? 2 : 0)}%` }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {d.day.slice(8, 10)}/{d.day.slice(5, 7)}: {formatBRL(d.revenue)} · {d.cars} carros
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>
          {bars[0].day.slice(8, 10)}/{bars[0].day.slice(5, 7)}
        </span>
        <span>
          {bars[bars.length - 1].day.slice(8, 10)}/{bars[bars.length - 1].day.slice(5, 7)}
        </span>
      </div>
    </div>
  );
}
