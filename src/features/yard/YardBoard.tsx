import { CalendarClock, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOs, listYard, setOsStatus, setPaymentStatus, type OsWithDetails } from '@/api/appointments';
import { checklistOsIds } from '@/api/checklist';
import { notifyStatus } from '@/api/push';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/hooks/useAuth';
import { useRealtimeOS } from '@/hooks/useRealtimeOS';
import type { OsStatus } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { formatBRL, formatTime } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { STATUS_LABELS, YARD_COLUMNS } from '@/lib/status';
import { dateKeyInZone, zonedTimeToUtc } from '@/lib/timezone';
import { ChecklistDialog } from './ChecklistDialog';
import { OSCard } from './OSCard';
import { WalkInDialog } from './WalkInDialog';
import { YardColumn } from './YardColumn';
import { applyYardChange, groupYard } from './yard';

/** Kanban do pátio: fica aberto o dia inteiro no tablet do balcão, atualizado pelo Realtime. */
export function YardBoard() {
  const { tenant } = useSession();
  const toast = useToast();
  const [list, setList] = useState<OsWithDetails[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [checklistOs, setChecklistOs] = useState<OsWithDetails | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const day = dateKeyInZone(new Date(), tenant.timezone);
      const from = zonedTimeToUtc(day, '00:00', tenant.timezone);
      const rows = await listYard(from.toISOString(), new Date(from.getTime() + 86_400_000).toISOString());
      setList(rows);
      setChecked(await checklistOsIds(rows.map((r) => r.id)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tenant.timezone]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeOS(`tenant_id=eq.${tenant.id}`, async (row, event) => {
    if (event === 'DELETE') return setList((l) => l.filter((o) => o.id !== row.id));
    const fresh = await getOs(row.id).catch(() => null);
    if (fresh) setList((l) => applyYardChange(l, fresh));
  });

  const { columns, arriving } = useMemo(() => groupYard(list), [list]);

  async function move(os: OsWithDetails, to: OsStatus) {
    if (to === 'WASHING' && !checked.has(os.id) && !confirm('Começar sem vistoria? Recomendamos fotografar o carro antes.')) return;
    setBusyId(os.id);
    // Otimista: o cartão já muda de coluna; o Realtime confirma.
    setList((l) => applyYardChange(l, { ...os, status: to }));
    try {
      await setOsStatus(os.id, to);
      if (to === 'READY') void notifyStatus(os.id);
      if (to === 'DELIVERED') toast(`OS ${os.number} entregue`);
    } catch (err) {
      toast(errorMessage(err), 'error');
      setList((l) => applyYardChange(l, os));
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(os: OsWithDetails) {
    if (!confirm(`Confirmar pagamento de ${formatBRL(os.total_amount)} da OS ${os.number}?`)) return;
    try {
      await setPaymentStatus(os.id, 'PAID');
      setList((l) => applyYardChange(l, { ...os, payment_status: 'PAID' }));
      toast('Pagamento registrado no caixa');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageSpinner />;

  const card = (os: OsWithDetails) => (
    <OSCard
      key={os.id}
      os={os}
      shopName={tenant.name}
      timeZone={tenant.timezone}
      busy={busyId === os.id}
      hasChecklist={checked.has(os.id)}
      onMove={move}
      onChecklist={setChecklistOs}
      onPaid={markPaid}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Pátio</h1>
        <Button variant="outline" size="lg" onClick={load} aria-label="Atualizar">
          <RefreshCw />
        </Button>
        <Button size="lg" onClick={() => setWalkIn(true)}>
          <Plus /> OS avulsa
        </Button>
      </div>
      {error && <Alert kind="error">{error}</Alert>}

      {arriving.length > 0 && (
        <section className="rounded-xl border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> Chegando hoje ({arriving.length})
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {arriving.map((os) => (
              <button
                key={os.id}
                onClick={() => move(os, 'WAITING')}
                className="flex min-w-[10rem] flex-col rounded-lg border p-2 text-left hover:border-primary"
                title={`Marcar como ${STATUS_LABELS.WAITING.toLowerCase()}`}
              >
                <span className="text-xs text-muted-foreground">{formatTime(os.scheduled_at, tenant.timezone)}</span>
                <span className="font-mono font-bold">{os.vehicle ? formatPlate(os.vehicle.plate) : '—'}</span>
                <span className="truncate text-xs">{os.customer_name}</span>
                <span className="mt-1 text-xs font-semibold text-primary">Chegou →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
        {YARD_COLUMNS.map((status) => (
          <YardColumn
            key={status}
            status={status}
            count={columns[status].length}
            onDropOs={(id) => {
              const os = list.find((o) => o.id === id);
              if (os && os.status !== status) void move(os, status);
            }}
          >
            {columns[status].map(card)}
          </YardColumn>
        ))}
      </div>

      <WalkInDialog open={walkIn} onOpenChange={setWalkIn} onCreated={() => toast('Carro na fila!')} />
      <ChecklistDialog os={checklistOs} onClose={() => setChecklistOs(null)} onSaved={(id) => setChecked((s) => new Set(s).add(id))} />
    </div>
  );
}
