import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CarFront, Clock, Plus } from 'lucide-react';
import { useApi, type Order, type OrderStatus } from '../../api';
import { useAuth } from '../../auth';
import { Empty, ErrorBox, Loading, PageHead, Plate, toast } from '../../ui';
import { fmtLong, fmtShort, STATUS } from '../../util';
import { moveOrder, NewOrderSheet, OrderSheet, YardCard } from './parts';

/** `short`: rótulo da aba em telas bem estreitas (320 px). */
const COLUMNS: { status: OrderStatus; label: string; short: string }[] = [
  { status: 'waiting', label: 'Aguardando', short: 'Fila' },
  { status: 'washing', label: 'Em lavagem', short: 'Lavando' },
  { status: 'finishing', label: 'Acabamento', short: 'Acabando' },
  { status: 'ready', label: 'Pronto', short: 'Pronto' },
];

interface YardData {
  today: string;
  orders: Order[];
  arriving: Order[];
  deliveredToday: number;
}

/** Pátio: Kanban (Aguardando | Em lavagem | Acabamento | Pronto) com botões grandes, atualizado a cada 15 s. */
export default function Yard() {
  const { user, unread } = useAuth();
  const { data, error, loading, reload } = useApi<YardData>('/staff/yard');
  const [col, setCol] = useState<OrderStatus>('waiting');
  const [open, setOpen] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error || 'Erro ao carregar'} onRetry={reload} />;

  const by = (s: OrderStatus) => data.orders.filter((o) => o.status === s);

  async function arrived(o: Order) {
    try {
      await moveOrder(o, 'waiting');
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <div>
      <PageHead
        eyebrow={`${user?.role === 'admin' ? 'Dono' : 'Operador'} · ${user?.name.split(' ')[0] || ''}`}
        title="Pátio"
        subtitle={`${fmtLong(data.today)} · ${data.orders.length} no pátio · ${data.deliveredToday} entregues em 24 h`}
        toolbar={
          <Link to="/admin/notificacoes" className="bar-btn" aria-label={unread ? `Notificações (${unread} novas)` : 'Notificações'}>
              <Bell size={23} strokeWidth={1.75} />
              {unread > 0 && (
                <span className="badge">{unread}</span>
              )}
            </Link>
        }
        action={
          <button className="btn-pill" onClick={() => setNewOpen(true)}>
            <Plus size={20} strokeWidth={2.4} /> OS avulsa
          </button>
        }
      />

      {data.arriving.length > 0 && (
        <section className="mb-7">
          <p className="group-title">Chegando · {data.arriving.length}</p>
          <div className="list">
            {data.arriving.map((o) => (
              <div key={o.id} className="cell gap-3 py-2.5">
                <button className="flex min-h-[44px] min-w-0 flex-1 flex-col items-start gap-1.5 text-left min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3" onClick={() => setOpen(o.id)}>
                  <Plate plate={o.plate} size="sm" />
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-body font-medium leading-tight">{o.model || o.clientName || 'Carro'}</span>
                    <span className={`mt-0.5 flex items-center gap-1 text-footnote ${o.date < data.today ? 'text-warn' : 'text-muted'}`}>
                      <Clock size={13} /> {o.date === data.today ? o.time : fmtShort(o.date, o.time)}
                    </span>
                  </span>
                </button>
                <button className="btn-secondary min-h-[36px] shrink-0 rounded-full px-3.5 text-subhead" onClick={() => arrived(o)}>
                  Chegou
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Celular: controle segmentado com uma coluna por vez. Desktop: as 4 colunas lado a lado. */}
      <div className="segmented mb-4 grid-cols-4 lg:hidden" role="tablist" aria-label="Colunas do pátio">
        {COLUMNS.map((c) => (
          <button
            key={c.status}
            role="tab"
            aria-selected={col === c.status}
            onClick={() => setCol(c.status)}
            className={`segment min-h-[52px] flex-col gap-0.5 px-0.5 leading-tight ${col === c.status ? 'segment-on' : ''}`}
          >
            <span className="flex items-center gap-1.5 text-body font-semibold tabular-nums">
              <span className={`h-2 w-2 rounded-full ${STATUS[c.status].bar}`} aria-hidden />
              {by(c.status).length}
            </span>
            <span className="max-w-full truncate text-caption min-[380px]:text-footnote">
              <span className="min-[360px]:hidden">{c.short}</span>
              <span className="hidden min-[360px]:inline">{c.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2 min-[1500px]:grid-cols-4">
        {COLUMNS.map((c) => {
          const list = by(c.status);
          return (
            <section key={c.status} className={`min-w-0 ${col === c.status ? 'animate-fade-in' : 'hidden lg:block'}`}>
              <h2 className="mb-3 hidden items-center gap-2 px-1 text-title3 font-bold lg:flex">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS[c.status].bar}`} aria-hidden />
                <span className="flex-1">{c.label}</span>
                <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-subhead font-semibold text-soft">{list.length}</span>
              </h2>
              {list.length === 0 && <Empty icon={CarFront} title="Nenhum carro" text={c.status === 'waiting' ? 'Abra uma OS avulsa ou marque a chegada de um agendado.' : undefined} />}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {list.map((o) => (
                  <YardCard key={o.id} o={o} onOpen={() => setOpen(o.id)} onChanged={reload} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <OrderSheet id={open} onClose={() => setOpen(null)} onChanged={reload} />
      <NewOrderSheet open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => reload()} />
    </div>
  );
}
