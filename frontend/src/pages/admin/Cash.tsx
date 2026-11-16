import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Plus, Receipt, Trash2 } from 'lucide-react';
import { api, useApi } from '../../api';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Field, FormError, Loading, PageHead, Sheet, toast } from '../../ui';
import { brl, fmtDate, METHOD, MONTHS, parseMoney } from '../../util';

interface Entry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amountCents: number;
  method: string;
  day: string;
  orderId: string | null;
}
interface CashData {
  month: string;
  entries: Entry[];
  summary: { incomeCents: number; expenseCents: number; balanceCents: number; byCategory: { type: string; category: string; totalCents: number }[] };
  categories: string[];
  pendingCents: number;
  pendingCount: number;
}

const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

/** Fluxo de caixa: entradas automáticas das OS pagas + despesas (e entradas avulsas) lançadas à mão. */
export default function Cash() {
  const config = useConfig();
  const [month, setMonth] = useState('');
  const current = month || config?.today.slice(0, 7) || '';
  const { data, error, loading, reload } = useApi<CashData>(current ? `/admin/cash?month=${current}` : null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: 'expense', category: '', description: '', amount: '', day: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!config) return <Loading />;
  const [y, m] = current.split('-').map(Number);
  const isCurrent = current === config.today.slice(0, 7);

  async function save() {
    const amountCents = parseMoney(f.amount);
    if (!amountCents) return setErr('Informe o valor');
    if (!f.category.trim()) return setErr('Escolha a categoria');
    setBusy(true);
    setErr('');
    try {
      await api.post('/admin/cash', { ...f, amountCents, day: f.day || config!.today });
      toast('Lançamento salvo');
      setOpen(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: Entry) {
    if (!confirm(`Apagar "${e.description || e.category}"?`)) return;
    try {
      await api.del(`/admin/cash/${e.id}`);
      reload();
    } catch (x) {
      toast((x as Error).message, true);
    }
  }

  return (
    <div>
      <PageHead
        title="Caixa"
        action={
          <button
            className="btn-pill"
            aria-label="Novo lançamento"
            onClick={() => {
              setF({ type: 'expense', category: '', description: '', amount: '', day: config.today });
              setErr('');
              setOpen(true);
            }}
          >
            <Plus size={22} /> <span className="hidden min-[380px]:inline">Lançar</span>
          </button>
        }
      />
      <div className="mb-5 flex items-center justify-between gap-2">
        <button className="icon-btn h-11 w-11" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(current, -1))}>
          <ChevronLeft size={20} />
        </button>
        <p className="text-title3 font-semibold first-letter:uppercase">
          {MONTHS[m - 1]} {y}
        </p>
        <button className="icon-btn h-11 w-11 disabled:opacity-30" aria-label="Próximo mês" disabled={isCurrent} onClick={() => setMonth(shiftMonth(current, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-card p-5 text-white shadow-[0_12px_28px_-14px_rgba(10,108,214,0.7)]" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(120,220,255,0.4), transparent 55%), linear-gradient(150deg, #0B5DB8, #0A6CD6 50%, #1FA2E6)' }}>
              <p className="text-footnote font-medium text-white/85">Saldo do mês</p>
              <p className="mt-1 break-words text-[clamp(30px,10vw,40px)] font-bold leading-none tracking-[-0.5px] tabular-nums">{brl(data.summary.balanceCents)}</p>
              <p className="mt-2 text-footnote text-white/85">A receber no pátio: {brl(data.pendingCents)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:gap-4">
              <div className="card p-5">
                <p className="text-footnote text-muted">Entradas</p>
                <p className="mt-1 break-words text-[clamp(20px,6.4vw,28px)] font-bold leading-none tabular-nums text-ok">{brl(data.summary.incomeCents)}</p>
              </div>
              <div className="card p-5">
                <p className="text-footnote text-muted">Despesas</p>
                <p className="mt-1 break-words text-[clamp(20px,6.4vw,28px)] font-bold leading-none tabular-nums text-danger">{brl(data.summary.expenseCents)}</p>
              </div>
            </div>
          </div>

          {data.summary.byCategory.length > 0 && (
            <section className="card mt-5 p-5">
              <h2 className="h2 mb-3">Por categoria</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.summary.byCategory.map((c) => (
                  <div key={`${c.type}:${c.category}`} className="flex items-center justify-between gap-3 rounded-cell bg-bg px-4 py-3">
                    <span className="min-w-0 truncate">{c.category}</span>
                    <span className={`shrink-0 font-bold ${c.type === 'income' ? 'text-ok' : 'text-danger'}`}>
                      {c.type === 'income' ? '+' : '−'} {brl(c.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="h2 mb-4">Lançamentos</h2>
            {data.entries.length === 0 && <Empty icon={Receipt} title="Nada no mês" text="As OS pagas entram aqui sozinhas; lance as despesas pelo botão Lançar." />}
            <div className="card divide-y divide-line">
              {data.entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  {e.type === 'income' ? <ArrowUpCircle className="shrink-0 text-ok" size={22} strokeWidth={1.75} /> : <ArrowDownCircle className="shrink-0 text-danger" size={22} strokeWidth={1.75} />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-body font-medium">{e.description || e.category}</p>
                    <p className="text-footnote text-muted">
                      {fmtDate(e.day)} · {e.category}
                      {e.method ? ` · ${METHOD[e.method] || e.method}` : ''}
                      {e.orderId ? ' · automático' : ''}
                    </p>
                  </div>
                  <p className={`shrink-0 text-subhead font-semibold tabular-nums ${e.type === 'income' ? 'text-ok' : 'text-danger'}`}>
                    {e.type === 'income' ? '+' : '−'} {brl(e.amountCents)}
                  </p>
                  {!e.orderId && (
                    <button className="-my-1 -ml-1 -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-danger active:opacity-50" aria-label="Apagar lançamento" onClick={() => remove(e)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <div className="grid gap-4">
          <div className="segmented grid-cols-2">
            {[
              ['expense', 'Despesa'],
              ['income', 'Entrada avulsa'],
            ].map(([k, v]) => (
              <button key={k} onClick={() => setF({ ...f, type: k, category: k === 'income' ? 'Outras entradas' : '' })} className={`segment ${f.type === k ? 'segment-on' : ''}`}>
                {v}
              </button>
            ))}
          </div>
          <Field label="Valor (R$)">
            <input className="input" inputMode="decimal" placeholder="0,00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label="Categoria">
            {f.type === 'expense' ? (
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                <option value="">Selecione</option>
                {data?.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input className="input" maxLength={60} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
            )}
          </Field>
          <Field label="Descrição">
            <input className="input" maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field label="Data">
            <input className="input" type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} />
          </Field>
          <FormError message={err} />
          <button className="btn-primary" disabled={busy} onClick={save}>
            Salvar
          </button>
        </div>
      </Sheet>
    </div>
  );
}
