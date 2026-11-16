import { useState } from 'react';
import { BadgePercent, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '../../api';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Loading, PageHead } from '../../ui';
import { addDays, brl, dayNum, monthShort } from '../../util';

interface Row {
  id: string;
  name: string;
  commissionPct: number;
  count: number;
  grossCents: number;
  commissionCents: number;
}
interface Data {
  from: string;
  to: string;
  rows: Row[];
  unassigned: number;
  totals: { count: number; grossCents: number; commissionCents: number };
}

/** Fechamento semanal (segunda a domingo): % de cada funcionário sobre as OS que ele lavou (ficaram prontas na semana). */
export default function Commissions() {
  const config = useConfig();
  const [week, setWeek] = useState('');
  const ref = week || config?.today || '';
  const { data, error, loading, reload } = useApi<Data>(ref ? `/admin/commissions?week=${ref}` : null);
  if (!config) return <Loading />;
  const period = data ? `${dayNum(data.from)} ${monthShort(data.from)} – ${dayNum(data.to)} ${monthShort(data.to)}` : '';

  return (
    <div>
      <PageHead title="Comissões" subtitle="Quem começou a lavar é o responsável pela OS. Dá para trocar na ficha da OS." />
      <div className="mb-5 flex items-center justify-between gap-2">
        <button className="icon-btn h-11 w-11" aria-label="Semana anterior" onClick={() => data && setWeek(addDays(data.from, -7))}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-base font-bold">{period}</p>
        <button className="icon-btn h-11 w-11 disabled:opacity-30" aria-label="Próxima semana" disabled={!data || data.to >= config.today} onClick={() => data && setWeek(addDays(data.from, 7))}>
          <ChevronRight size={20} />
        </button>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['OS', String(data.totals.count)],
              ['Valor', brl(data.totals.grossCents)],
              ['Comissões', brl(data.totals.commissionCents)],
            ].map(([k, v], i) => (
              <div key={k} className={`min-w-0 rounded-card p-4 ${i === 2 ? 'bg-brand text-onaccent' : 'card'}`}>
                <p className={`text-sm ${i === 2 ? '' : 'text-soft'}`}>{k}</p>
                <p className="break-words text-[clamp(17px,5vw,24px)] font-bold leading-tight tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          {data.unassigned > 0 && <p className="mt-3 rounded-cell bg-warnbg p-4 text-sm text-warn">{data.unassigned} OS pronta(s) sem responsável na semana: não entram em nenhuma comissão.</p>}
          {data.rows.length === 0 && (
            <div className="mt-5">
              <Empty icon={BadgePercent} title="Ninguém na equipe" text="Cadastre a equipe e o % de comissão em Equipe e boxes." />
            </div>
          )}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.rows.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-body font-semibold">{r.name}</p>
                  <p className="shrink-0 text-title3 font-bold tabular-nums text-ink">{brl(r.commissionCents)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {r.count} {r.count === 1 ? 'lavagem' : 'lavagens'} · {brl(r.grossCents)} · {r.commissionPct}%
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
