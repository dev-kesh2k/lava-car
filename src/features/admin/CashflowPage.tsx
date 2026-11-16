import { ArrowDownCircle, ArrowUpCircle, Minus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { deleteCashEntry, listCashEntries } from '@/api/finance';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import { summarizeCash } from '@/lib/cashflow';
import { errorMessage } from '@/lib/errors';
import { formatBRL } from '@/lib/format';
import { monthToDate } from '@/lib/periods';
import { cn } from '@/lib/utils';
import { KpiCard } from './KpiCard';
import { ExpenseForm } from './ExpenseForm';

/** Fluxo de caixa: entradas automáticas das OS pagas + despesas lançadas à mão. */
export function CashflowPage() {
  const { profile, tenant } = useSession();
  const toast = useToast();
  const month = monthToDate(tenant.timezone);
  const [from, setFrom] = useState(month.from);
  const [to, setTo] = useState(month.to);
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useAsync(() => listCashEntries(from, to), [from, to]);
  const summary = summarizeCash(data ?? []);

  async function remove(id: string) {
    if (!confirm('Apagar esta despesa?')) return;
    try {
      await deleteCashEntry(id);
      await reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fluxo de caixa"
        actions={
          <Button variant="destructive" onClick={() => setAdding(true)}>
            <Minus /> Despesa
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
        <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={ArrowUpCircle} label="Entradas" value={formatBRL(summary.income)} />
        <KpiCard icon={ArrowDownCircle} label="Saídas" value={formatBRL(summary.expense)} />
        <KpiCard icon={Wallet} label="Saldo" value={formatBRL(summary.balance)} />
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Skeleton className="h-64" />
      ) : data?.length ? (
        <Card className="divide-y">
          {data.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-3">
              {e.type === 'INCOME' ? <ArrowUpCircle className="h-5 w-5 text-success" /> : <ArrowDownCircle className="h-5 w-5 text-destructive" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.description || e.category}</p>
                <p className="text-xs text-muted-foreground">
                  {e.occurred_on.split('-').reverse().join('/')} · {e.category}
                </p>
              </div>
              <span className={cn('font-semibold tabular-nums', e.type === 'INCOME' ? 'text-success' : 'text-destructive')}>
                {e.type === 'INCOME' ? '+' : '−'} {formatBRL(e.amount)}
              </span>
              {!e.os_id && (
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Apagar">
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Wallet} title="Nenhum lançamento no período" />
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            tenantId={tenant.id}
            userId={profile.id}
            today={month.to}
            onSaved={() => {
              setAdding(false);
              toast('Despesa lançada');
              void reload();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
