import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useState } from 'react';
import { getCommissions } from '@/api/finance';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { commissionReceipt, commissionTotals } from '@/lib/commission';
import { formatBRL } from '@/lib/format';
import { formatPeriod, weekOf } from '@/lib/periods';
import { addDays, dateKeyInZone } from '@/lib/timezone';

/** Fechamento semanal (segunda a domingo) para pagar a equipe. */
export function CommissionReport({ timeZone }: { timeZone: string }) {
  const toast = useToast();
  const [anchor, setAnchor] = useState(() => dateKeyInZone(new Date(), timeZone));
  const week = weekOf(anchor);
  const { data, loading, error } = useAsync(() => getCommissions(week.from, week.to), [week.from, week.to]);
  const totals = commissionTotals(data ?? []);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Comissões</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(week.from, -7))} aria-label="Semana anterior">
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular-nums">{formatPeriod(week)}</span>
          <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(week.from, 7))} aria-label="Próxima semana">
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <Alert kind="error">{error}</Alert>}
        {loading ? (
          <Skeleton className="h-32" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Funcionário</th>
                <th className="py-2 text-right">OS</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2 text-right">Comissão</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).map((r) => (
                <tr key={r.employee_id}>
                  <td className="py-2">
                    {r.full_name || 'Sem nome'} <span className="text-xs text-muted-foreground">{Number(r.commission_pct)}%</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.os_count}</td>
                  <td className="py-2 text-right tabular-nums">{formatBRL(r.gross)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatBRL(r.commission)}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copiar recibo"
                      onClick={async () => {
                        await navigator.clipboard.writeText(commissionReceipt(r, formatPeriod(week)));
                        toast('Recibo copiado');
                      }}
                    >
                      <Copy />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr>
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{totals.osCount}</td>
                <td className="py-2 text-right tabular-nums">{formatBRL(totals.gross)}</td>
                <td className="py-2 text-right tabular-nums">{formatBRL(totals.commission)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
