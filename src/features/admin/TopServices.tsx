import type { DashboardSummary } from '@/lib/database.types';
import { topServicesShare } from '@/lib/dashboard';
import { formatBRL } from '@/lib/format';

export function TopServices({ top }: { top: DashboardSummary['top_services'] }) {
  if (!top.length) return <p className="text-sm text-muted-foreground">Nenhum serviço concluído no período.</p>;
  return (
    <ol className="space-y-3">
      {topServicesShare(top).map((t, i) => (
        <li key={t.name}>
          <div className="flex justify-between text-sm">
            <span>
              {i + 1}. {t.name}
            </span>
            <span className="text-muted-foreground">
              {t.qty}× · {formatBRL(t.revenue)}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${t.width}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
