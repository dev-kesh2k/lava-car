import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, MessageSquareHeart, Settings, Trophy } from 'lucide-react';
import { useApi } from '../../api';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Loading, PageHead } from '../../ui';
import { brl, dayNum, fmtDate, fmtLong, MONTHS } from '../../util';

interface Dash {
  today: string;
  month: string;
  studioName: string;
  revenueToday: number;
  revenueMonth: number;
  washedToday: number;
  washedMonth: number;
  avgTicket: number;
  paidCount: number;
  top: { name: string; qty: number; revenueCents: number }[];
  days: { day: string; revenueCents: number; cars: number }[];
  yard: Record<string, number>;
  scheduledToday: number;
  unread: number;
  feedbackUnread: number;
}

const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

function Stat({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-card p-4 min-[380px]:p-5 ${accent ? 'text-white shadow-[0_12px_28px_-14px_rgba(10,108,214,0.7)]' : 'card'}`}
      style={accent ? { background: 'radial-gradient(120% 90% at 100% 0%, rgba(120,220,255,0.4), transparent 55%), linear-gradient(150deg, #0B5DB8, #0A6CD6 50%, #1FA2E6)' } : undefined}
    >
      <span className={`text-footnote font-medium ${accent ? 'text-white/85' : 'text-muted'}`}>{label}</span>
      <span className="mt-1.5 break-words text-[clamp(22px,7vw,30px)] font-bold leading-none tracking-[-0.5px] tabular-nums">{value}</span>
      <span className={`mt-2 text-footnote ${accent ? 'text-white/85' : 'text-muted'}`}>{note}</span>
    </div>
  );
}

/** Faturamento por dia do mês: série única, hoje em destaque, valor ao tocar. */
function DayBars({ days, today }: { days: Dash['days']; today: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.revenueCents), 1);
  const focus = hover ?? days.findIndex((d) => d.day === today);
  const f = days[focus];
  return (
    <div>
      <div className="mb-3 min-h-[3rem]" aria-live="polite">
        {f && (
          <>
            <p className="text-footnote text-muted">
              {fmtDate(f.day)} · {f.cars} {f.cars === 1 ? 'carro' : 'carros'}
            </p>
            <p className="text-title2 font-bold tabular-nums">{brl(f.revenueCents)}</p>
          </>
        )}
      </div>
      <div className="flex h-[140px] items-end gap-[2px] hairline-b" role="list" aria-label="Faturamento por dia">
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            role="listitem"
            aria-label={`${fmtDate(d.day)}: ${brl(d.revenueCents)}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(i)}
            className="relative block h-full min-w-0 flex-1"
          >
            <span
              className={`absolute inset-x-0 bottom-0 mx-auto max-w-[28px] rounded-t-[4px] transition-colors duration-200 ${d.day === today ? 'bg-brand' : hover === i ? 'bg-accent/60' : 'bg-accent/25'}`}
              style={{ height: d.revenueCents ? Math.max(3, Math.round((d.revenueCents / max) * 130)) : 0 }}
            />
          </button>
        ))}
      </div>
      {days.length > 0 && (
        <div className="mt-2 flex justify-between text-footnote text-muted">
          <span>{dayNum(days[0].day)}</span>
          <span>{dayNum(days[days.length - 1].day)}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const config = useConfig();
  const [month, setMonth] = useState('');
  const current = month || config?.today.slice(0, 7) || '';
  const { data, error, loading, reload } = useApi<Dash>(current ? `/admin/dashboard?month=${current}` : null);

  if (!config || (loading && !data)) return <Loading />;
  if (error || !data) return <ErrorBox message={error || 'Erro ao carregar'} onRetry={reload} />;
  const [y, m] = data.month.split('-').map(Number);
  const isCurrent = data.month === data.today.slice(0, 7);
  const maxQty = Math.max(1, ...data.top.map((t) => t.qty));
  const yardTotal = Object.values(data.yard).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHead
        eyebrow="Painel do dono"
        title={data.studioName}
        subtitle={fmtLong(data.today)}
        toolbar={
          <>
            <Link to="/admin/notificacoes" className="bar-btn" aria-label={data.unread ? `Notificações (${data.unread} novas)` : 'Notificações'}>
              <Bell size={23} strokeWidth={1.75} />
              {data.unread > 0 && <span className="badge">{data.unread}</span>}
            </Link>
            <Link to="/admin/feedback" className="bar-btn" aria-label={data.feedbackUnread ? `Feedback (${data.feedbackUnread} novos)` : 'Feedback dos clientes'}>
              <MessageSquareHeart size={23} strokeWidth={1.75} />
              {data.feedbackUnread > 0 && <span className="badge">{data.feedbackUnread}</span>}
            </Link>
            <Link to="/admin/config" className="bar-btn md:hidden" aria-label="Configurações">
              <Settings size={23} strokeWidth={1.75} />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat accent label="Faturamento hoje" value={brl(data.revenueToday)} note={`${data.washedToday} ${data.washedToday === 1 ? 'carro lavado' : 'carros lavados'}`} />
        <Stat label="No pátio agora" value={String(yardTotal)} note={`${data.yard.ready || 0} prontos · ${data.scheduledToday} a chegar`} />
        <Stat label="Faturamento do mês" value={brl(data.revenueMonth)} note={`${data.paidCount} ${data.paidCount === 1 ? 'OS paga' : 'OS pagas'}`} />
        <Stat label="Ticket médio" value={brl(data.avgTicket)} note={`${data.washedMonth} carros no mês`} />
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between gap-2">
        <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(data.month, -1))}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-title3 font-semibold first-letter:uppercase">
          {MONTHS[m - 1]} {y}
        </p>
        <button className="icon-btn" aria-label="Próximo mês" disabled={isCurrent} onClick={() => setMonth(shiftMonth(data.month, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="h2 mb-4">Faturamento por dia</h2>
          <DayBars days={data.days} today={data.today} />
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="h2 mb-4">Mais vendidos</h2>
          {data.top.length === 0 && <Empty icon={Trophy} title="Sem lavagens no mês" text="Os serviços das OS prontas aparecem aqui." />}
          <div className="grid gap-4">
            {data.top.map((t) => (
              <div key={t.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{t.name}</span>
                  <span className="shrink-0 text-footnote text-muted">
                    {t.qty}× · {brl(t.revenueCents)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((t.qty / maxQty) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
