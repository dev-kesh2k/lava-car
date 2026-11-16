import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { useConfig } from '../../config';
import { ErrorBox, Loading, PageHead, Plate, StatusPill } from '../../ui';
import { addDays, brl, dayNum, duration, fmtDate, fmtShort, monthShort, STATUS, WEEKDAYS_SHORT, weekdayOf, weekStart } from '../../util';
import { NewOrderSheet, OrderSheet } from './parts';

function OrderRow({ o, onClick }: { o: Order; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition active:scale-[0.99] sm:px-5">
      <div className="w-[3.2rem] shrink-0 text-center">
        <p className="text-lg font-bold leading-tight">{o.time}</p>
        <p className="text-xs text-muted">{duration(o.durationMin)}</p>
      </div>
      <span className={`w-1 shrink-0 self-stretch rounded-full ${STATUS[o.status].bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Plate plate={o.plate} size="sm" />
          <span className="truncate text-sm text-muted">{o.box?.name}</span>
        </div>
        <p className="mt-1 truncate font-bold">{o.clientName || o.model || 'Cliente avulso'}</p>
        <p className="truncate text-sm text-muted">
          {o.items.map((i) => i.name).join(' + ')} · {brl(o.dueCents)}
        </p>
      </div>
      <span className="hidden shrink-0 sm:block">
        <StatusPill status={o.status} />
      </span>
    </button>
  );
}

export default function Agenda() {
  const config = useConfig();
  const [params, setParams] = useSearchParams();
  const today = config?.today || '';
  const day = params.get('day') || today;
  const start = day ? weekStart(day) : '';
  const week = start ? Array.from({ length: 7 }, (_, i) => addDays(start, i)) : [];
  const orders = useApi<{ orders: Order[] }>(start ? `/staff/orders?from=${start}&to=${addDays(start, 6)}` : null);
  const [open, setOpen] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  if (!config) return <Loading />;
  const setDay = (d: string) => setParams({ day: d }, { replace: true });
  const dayOrders = (orders.data?.orders || []).filter((o) => o.date === day && o.status !== 'cancelled');
  const cancelled = (orders.data?.orders || []).filter((o) => o.date === day && o.status === 'cancelled');
  const countByDay = (d: string) => (orders.data?.orders || []).filter((o) => o.date === d && o.status !== 'cancelled').length;

  return (
    <div>
      <PageHead
        title="Agenda"
        subtitle={`${config.boxes} ${config.boxes === 1 ? 'box' : 'boxes'} de lavagem · horários de ${config.slotIntervalMin} em ${config.slotIntervalMin} min`}
        action={
          <button className="btn-pill" onClick={() => setNewOpen(true)}>
            <Plus size={22} /> Novo
          </button>
        }
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <button className="icon-btn h-11 w-11" aria-label="Semana anterior" onClick={() => setDay(addDays(start, -7))}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-base text-soft">
          {dayNum(start)} {monthShort(start)} – {dayNum(addDays(start, 6))} {monthShort(addDays(start, 6))}
        </p>
        <button className="icon-btn h-11 w-11" aria-label="Próxima semana" onClick={() => setDay(addDays(start, 7))}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5" role="tablist" aria-label="Dias da semana">
        {week.map((d) => {
          const sel = d === day;
          const closed = !config.schedule[weekdayOf(d)]?.open;
          const n = countByDay(d);
          return (
            <button
              key={d}
              role="tab"
              aria-selected={sel}
              aria-label={`${fmtShort(d)}${n ? `, ${n} lavagens` : ''}`}
              onClick={() => setDay(d)}
              className={`relative flex min-h-[72px] min-w-0 flex-col items-center justify-center rounded-2xl border transition sm:min-h-[84px] ${
                sel ? 'border-accent bg-accent text-bg' : d === today ? 'border-accent/60 bg-surface' : 'border-line bg-surface'
              } ${closed && !sel ? 'opacity-50' : ''}`}
            >
              <span className={`text-[13px] sm:text-sm ${sel ? 'text-bg' : 'text-muted'}`}>{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
              <span className="text-[clamp(1.05rem,5vw,1.5rem)] font-bold leading-tight">{dayNum(d)}</span>
              {n > 0 && <span className={`absolute bottom-1 text-[11px] font-bold ${sel ? 'text-bg' : 'text-accent'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="h2 mb-4">{day === today ? 'Hoje' : fmtShort(day)}</h2>
        {orders.loading && !orders.data && <Loading />}
        {orders.error && <ErrorBox message={orders.error} onRetry={orders.reload} />}
        {orders.data && dayOrders.length === 0 && (
          <div className="card flex items-center gap-3 p-5 text-muted">
            <CalendarOff size={22} className="shrink-0" />
            {!config.schedule[weekdayOf(day)]?.open ? 'Fechado nesse dia.' : `Nenhuma lavagem em ${fmtDate(day)}.`}
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {dayOrders.map((o) => (
            <OrderRow key={o.id} o={o} onClick={() => setOpen(o.id)} />
          ))}
        </div>
        {cancelled.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 font-bold text-muted">Cancelados</h3>
            <div className="grid gap-3 opacity-70 lg:grid-cols-2">
              {cancelled.map((o) => (
                <OrderRow key={o.id} o={o} onClick={() => setOpen(o.id)} />
              ))}
            </div>
          </>
        )}
      </section>

      <OrderSheet id={open} onClose={() => setOpen(null)} onChanged={orders.reload} />
      <NewOrderSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        scheduleDefault={day < today || !config.schedule[weekdayOf(day)]?.open ? today : day}
        onCreated={(o) => {
          setDay(o.date);
          orders.reload();
        }}
      />
    </div>
  );
}
