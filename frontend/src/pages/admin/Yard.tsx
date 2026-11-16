import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CarFront, Clock, Plus } from 'lucide-react';
import { useApi, type Order, type OrderStatus } from '../../api';
import { useAuth } from '../../auth';
import { Empty, ErrorBox, Loading, Plate, toast } from '../../ui';
import { fmtLong, fmtShort } from '../../util';
import { moveOrder, NewOrderSheet, OrderSheet, YardCard } from './parts';

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'waiting', label: 'Aguardando' },
  { status: 'washing', label: 'Em lavagem' },
  { status: 'finishing', label: 'Acabamento' },
  { status: 'ready', label: 'Pronto' },
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
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-bold uppercase tracking-[0.12em] text-muted">{user?.role === 'admin' ? 'Dono' : 'Operador'} · {user?.name.split(' ')[0]}</p>
          <Link to="/admin/notificacoes" className="icon-btn h-11 w-11" aria-label={unread ? `Notificações (${unread} novas)` : 'Notificações'}>
            <Bell size={20} />
            {unread > 0 && <span className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-surface bg-accent" />}
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="h1 min-w-0 flex-1">Pátio</h1>
          <button className="btn-pill" onClick={() => setNewOpen(true)}>
            <Plus size={22} /> OS avulsa
          </button>
        </div>
        <p className="mt-2 text-base text-muted">
          {fmtLong(data.today)} · {data.orders.length} no pátio · {data.deliveredToday} entregues em 24 h
        </p>
      </header>

      {data.arriving.length > 0 && (
        <section className="mb-6">
          <h2 className="h2 mb-3">Chegando</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            {data.arriving.map((o) => (
              <div key={o.id} className="card flex min-w-0 items-center gap-3 p-3">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen(o.id)}>
                  <Plate plate={o.plate} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{o.model || o.clientName || 'Carro'}</span>
                    <span className={`flex items-center gap-1 text-sm ${o.date < data.today ? 'text-warn' : 'text-muted'}`}>
                      <Clock size={14} /> {o.date === data.today ? o.time : fmtShort(o.date, o.time)}
                    </span>
                  </span>
                </button>
                <button className="btn-secondary min-h-[48px] shrink-0 px-3 text-sm" onClick={() => arrived(o)}>
                  Chegou
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Celular: uma coluna por vez (abas com contagem). Desktop: as 4 colunas lado a lado. */}
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-1 lg:hidden" role="tablist" aria-label="Colunas do pátio">
        {COLUMNS.map((c) => (
          <button
            key={c.status}
            role="tab"
            aria-selected={col === c.status}
            onClick={() => setCol(c.status)}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-xl px-0.5 leading-tight transition ${col === c.status ? 'bg-accent font-bold text-bg' : 'text-soft'}`}
          >
            <span className="text-lg font-bold">{by(c.status).length}</span>
            <span className="max-w-full truncate text-[clamp(10px,3vw,13px)]">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2 min-[1500px]:grid-cols-4">
        {COLUMNS.map((c) => {
          const list = by(c.status);
          return (
            <section key={c.status} className={`min-w-0 ${col === c.status ? '' : 'hidden lg:block'}`}>
              <h2 className="mb-3 hidden items-center justify-between font-display text-xl font-bold uppercase lg:flex">
                {c.label} <span className="rounded-full bg-surface2 px-2.5 font-sans text-base text-soft">{list.length}</span>
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
