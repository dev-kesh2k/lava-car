import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, History, XCircle } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { useSavedPhone } from '../../client';
import PhoneGate from './PhoneGate';
import { Empty, ErrorBox, Loading, PageHead } from '../../ui';
import { OrderCard } from './parts';

const TABS = [
  { id: 'next', label: 'Em aberto' },
  { id: 'past', label: 'Anteriores' },
  { id: 'cancel', label: 'Cancelados' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Bookings() {
  const [tab, setTab] = useState<TabId>('next');
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<{ orders: Order[]; today: string }>(phone ? `/orders/by-phone?phone=${encodeURIComponent(phone)}` : null);

  if (!phone)
    return (
      <div>
        <PageHead title="Minhas lavagens" />
        <PhoneGate onSubmit={setPhone} />
      </div>
    );

  const groups: Record<TabId, Order[]> = { next: [], past: [], cancel: [] };
  for (const b of data?.orders || []) {
    if (b.status === 'cancelled') groups.cancel.push(b);
    else if (b.status === 'delivered' || (b.status === 'scheduled' && b.date < data!.today)) groups.past.push(b);
    else groups.next.push(b);
  }
  groups.next.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const list = groups[tab];

  return (
    <div>
      <PageHead
        title="Minhas lavagens"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3">
            Celular {phone}
            <button className="min-h-[44px] font-bold text-accent" onClick={() => setPhone('')}>
              Trocar número
            </button>
          </span>
        }
        action={
          <Link to="/agendar" className="btn-pill" aria-label="Novo agendamento">
            <CalendarPlus size={20} /> <span className="hidden min-[380px]:inline">Novo</span>
          </Link>
        }
      />
      <div className="mb-5 segmented grid-cols-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`segment truncate ${tab === t.id ? 'segment-on' : ''}`}
          >
            {t.label}
            {data && groups[t.id].length > 0 && <span className="ml-1 hidden opacity-70 min-[400px]:inline">{groups[t.id].length}</span>}
          </button>
        ))}
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && list.length === 0 && (
        <Empty
          icon={tab === 'next' ? CalendarPlus : tab === 'past' ? History : XCircle}
          title={tab === 'next' ? 'Nenhuma lavagem em aberto' : tab === 'past' ? 'Nenhuma lavagem anterior' : 'Nada cancelado'}
          text={tab === 'next' ? 'Nenhum agendamento com esse celular. Agende a próxima lavagem em menos de 1 minuto.' : undefined}
          action={
            tab === 'next' ? (
              <Link to="/agendar" className="btn-primary w-full">
                Agendar
              </Link>
            ) : undefined
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((b) => (
          <OrderCard key={b.id} order={b} />
        ))}
      </div>
    </div>
  );
}
