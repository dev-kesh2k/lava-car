import { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { api, useApi, type Service, type Size } from '../../api';
import { CarSilhouette, ErrorBox, Field, FormError, Loading, PageHead, ServiceIcon, SERVICE_ICON_KEYS, Sheet, Switch, toast } from '../../ui';
import { brl, duration, moneyInput, parseMoney, SIZE_INFO, SIZES } from '../../util';

type Form = { id: string; name: string; description: string; kind: 'main' | 'addon'; durationMin: string; icon: string; active: boolean; prices: Record<Size, string> };
const blank: Form = { id: '', name: '', description: '', kind: 'main', durationMin: '30', icon: 'droplet', active: true, prices: { small: '', medium: '', large: '', pickup: '' } };

/** Serviços principais e adicionais com a matriz de preços (serviço × porte). */
export default function Services() {
  const { data, error, loading, reload } = useApi<{ services: Service[] }>('/admin/services');
  const [f, setF] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error || 'Erro ao carregar'} onRetry={reload} />;

  function edit(s?: Service) {
    setErr('');
    if (!s) return setF({ ...blank, prices: { ...blank.prices } });
    const prices = { ...blank.prices };
    for (const p of s.prices) prices[p.size] = moneyInput(p.priceCents);
    setF({ id: s.id, name: s.name, description: s.description, kind: s.kind, durationMin: String(s.durationMin), icon: s.icon, active: s.active, prices });
  }

  async function save() {
    if (!f) return;
    const prices: Partial<Record<Size, number>> = {};
    for (const size of SIZES) {
      if (!f.prices[size].trim()) continue;
      const c = parseMoney(f.prices[size]);
      if (c === null) return setErr(`Preço inválido para ${SIZE_INFO[size].label}`);
      prices[size] = c;
    }
    setBusy(true);
    setErr('');
    try {
      const body = { ...f, durationMin: Number(f.durationMin), prices };
      if (f.id) await api.put(`/admin/services/${f.id}`, body);
      else await api.post('/admin/services', body);
      toast('Serviço salvo');
      setF(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Service, active: boolean) {
    try {
      await api.patch(`/admin/services/${s.id}/active`, { active });
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove() {
    if (!f?.id || !confirm(`Excluir ${f.name}?`)) return;
    try {
      await api.del(`/admin/services/${f.id}`);
      toast('Serviço excluído');
      setF(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const groups: [string, Service[]][] = [
    ['Lavagens (principal)', data.services.filter((s) => s.kind === 'main')],
    ['Adicionais', data.services.filter((s) => s.kind === 'addon')],
  ];

  return (
    <div>
      <PageHead
        title="Serviços e preços"
        subtitle="Um preço por porte. Sem preço = o serviço não aparece para aquele porte."
        action={
          <button className="btn-pill" aria-label="Novo serviço" onClick={() => edit()}>
            <Plus size={22} /> Novo
          </button>
        }
      />
      {groups.map(([title, list]) => (
        <section key={title} className="mb-8">
          <h2 className="h2 mb-3 px-1">
            {title} <span className="text-subhead font-medium text-muted">· {list.length}</span>
          </h2>
          <div className="grid gap-3 xl:grid-cols-2">
            {list.map((s) => (
              <div key={s.id} className={`card overflow-hidden transition-opacity duration-200 ${s.active ? '' : 'opacity-55'}`}>
                <div className="flex items-center gap-3 p-4 pb-3">
                  <ServiceIcon icon={s.icon} active={s.active} size="sm" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => edit(s)}>
                    <p className="line-clamp-2 text-body font-semibold leading-snug">{s.name}</p>
                    <p className="flex items-center gap-1 text-footnote text-muted">
                      <Clock size={13} /> {duration(s.durationMin)} <span className="text-accent">· Editar</span>
                    </p>
                  </button>
                  <Switch label={`${s.name} ativo`} checked={s.active} onChange={(v) => toggle(s, v)} />
                </div>
                <button onClick={() => edit(s)} className="grid w-full grid-cols-4 bg-bg/60 text-center hairline-t" aria-label={`Preços de ${s.name}`}>
                  {SIZES.map((size, i) => {
                    const p = s.prices.find((x) => x.size === size);
                    return (
                      <div key={size} className={`min-w-0 px-1 py-2.5 ${i ? 'border-l-[0.5px] border-line/60' : ''}`}>
                        <CarSilhouette size={size} className={`mx-auto h-4 w-8 ${p ? 'text-muted' : 'text-dis'}`} />
                        <p className="mt-1 truncate text-caption text-muted">{SIZE_INFO[size].short}</p>
                        <p className={`truncate text-[clamp(13px,3.8vw,15px)] font-semibold tabular-nums ${p ? 'text-ink' : 'text-dis'}`}>{p ? brl(p.priceCents) : '—'}</p>
                      </div>
                    );
                  })}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Sheet open={!!f} onClose={() => setF(null)} title={f?.id ? 'Editar serviço' : 'Novo serviço'}>
        {f && (
          <div className="grid gap-4">
            <div className="segmented grid-cols-2">
              {(['main', 'addon'] as const).map((k) => (
                <button key={k} onClick={() => setF({ ...f, kind: k })} className={`segment ${f.kind === k ? 'segment-on' : ''}`}>
                  {k === 'main' ? 'Principal' : 'Adicional'}
                </button>
              ))}
            </div>
            <Field label="Nome">
              <input className="input" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Descrição">
              <input className="input" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </Field>
            <Field label="Duração (min)" hint="Soma com os adicionais para ocupar o box">
              <input className="input" inputMode="numeric" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
            </Field>
            <div>
              <span className="label">Preço por porte (R$)</span>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map((size) => (
                  <Field key={size} label={`${SIZE_INFO[size].label}/${SIZE_INFO[size].short}`}>
                    <input className="input" inputMode="decimal" placeholder="—" value={f.prices[size]} onChange={(e) => setF({ ...f, prices: { ...f.prices, [size]: e.target.value } })} />
                  </Field>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Ícone</span>
              <div className="flex flex-wrap gap-2">
                {SERVICE_ICON_KEYS.map((k) => (
                  <button key={k} type="button" aria-label={k} aria-pressed={f.icon === k} onClick={() => setF({ ...f, icon: k })} className={`rounded-[14px] p-[3px] ring-2 transition-shadow ${f.icon === k ? 'ring-accent' : 'ring-transparent'}`}>
                    <ServiceIcon icon={k} size="sm" />
                  </button>
                ))}
              </div>
            </div>
            <div className="card flex min-h-[50px] items-center justify-between px-4">
              <span>Ativo (aparece no app)</span>
              <Switch label="Ativo" checked={f.active} onChange={(v) => setF({ ...f, active: v })} />
            </div>
            <FormError message={err} />
            <button className="btn-primary" disabled={busy} onClick={save}>
              Salvar
            </button>
            {f.id && (
              <button className="btn-danger" onClick={remove}>
                Excluir
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
