import { Car, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { getDashboard } from '@/api/finance';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import { formatBRL } from '@/lib/format';
import { formatPeriod, monthToDate, today } from '@/lib/periods';
import { cn } from '@/lib/utils';
import { KpiCard } from './KpiCard';
import { RevenueChart } from './RevenueChart';
import { TopServices } from './TopServices';

/** Painel do dono: faturamento, carros lavados, ticket médio e serviços mais vendidos. */
export function DashboardPage() {
  const { tenant } = useSession();
  const [range, setRange] = useState<'today' | 'month'>('today');
  const period = range === 'today' ? today(tenant.timezone) : monthToDate(tenant.timezone);
  const { data, loading, error } = useAsync(() => getDashboard(period.from, period.to), [period.from, period.to]);
  const month = useAsync(() => {
    const m = monthToDate(tenant.timezone);
    return getDashboard(m.from, m.to);
  }, [tenant.timezone]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Painel"
        description={formatPeriod(period)}
        actions={
          <div className="flex rounded-lg bg-muted p-1 text-sm">
            {(
              [
                ['today', 'Hoje'],
                ['month', 'Mês'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => setRange(k)} className={cn('rounded-md px-3 py-1.5', range === k && 'bg-background font-medium shadow-sm')}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      {error && <Alert kind="error">{error}</Alert>}
      {loading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={DollarSign} label="Faturamento" value={formatBRL(data.revenue)} hint={`${data.paid_count} OS pagas`} />
          <KpiCard icon={Car} label="Carros lavados" value={String(data.cars_washed)} />
          <KpiCard icon={Receipt} label="Ticket médio" value={formatBRL(data.avg_ticket)} />
          <KpiCard
            icon={TrendingUp}
            label="Mês até agora"
            value={month.data ? formatBRL(month.data.revenue) : '—'}
            hint={month.data ? `${month.data.cars_washed} carros` : undefined}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento do mês</CardTitle>
          </CardHeader>
          <CardContent>{month.data ? <RevenueChart days={month.data.by_day} /> : <Skeleton className="h-40" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mais vendidos ({range === 'today' ? 'hoje' : 'mês'})</CardTitle>
          </CardHeader>
          <CardContent>{data ? <TopServices top={data.top_services} /> : <Skeleton className="h-40" />}</CardContent>
        </Card>
      </div>
    </div>
  );
}
