import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Gift, Search, Trash2, X } from 'lucide-react';
import { api, fetchImageUrl, useApi, type Box, type Loyalty, type Order, type Service, type Size, type Slot, type Vehicle } from '../../api';
import { useAuth } from '../../auth';
import { isValidPhone, maskPhone } from '../../client';
import { useConfig } from '../../config';
import { WhatsAppLogo } from '../../brand-icons';
import { Checkbox, Field, FormError, Loading, Plate, Sheet, SizePicker, StatusPill, toast } from '../../ui';
import {
  brl,
  duration,
  fmtShort,
  isValidPlate,
  maskPlate,
  METHOD,
  nextStatus,
  prevStatus,
  priceFor,
  readyMessage,
  resizeImage,
  sizeLabel,
  STATUS,
  waLink,
} from '../../util';

export interface Catalog {
  services: Service[];
  boxes: Box[];
  team: { id: string; name: string; role: string }[];
}

/** Rótulo do botão "avançar" de cada etapa. */
export const ADVANCE: Record<string, string> = {
  scheduled: 'Chegou ao pátio',
  waiting: 'Começar lavagem',
  washing: 'Ir para acabamento',
  finishing: 'Marcar pronto',
  ready: 'Entregar',
};

/** Rótulo curto para o botão do cartão do pátio (cabe nas 4 colunas do desktop). */
const ADVANCE_SHORT: Record<string, string> = { scheduled: 'Chegou', waiting: 'Lavar', washing: 'Acabamento', finishing: 'Pronto', ready: 'Entregar' };

/** Avança/volta a etapa. Ao ficar Pronto, devolve o texto do WhatsApp para o botão. */
export async function moveOrder(o: Order, to: string, employeeId?: string) {
  const r = await api.post<{ order: Order; whatsappText: string | null }>(`/staff/orders/${o.id}/status`, { status: to, employeeId });
  toast(`OS ${o.number}: ${STATUS[r.order.status].label}`);
  return r;
}

export function WhatsAppButton({ o, compact }: { o: Order; compact?: boolean }) {
  if (!o.clientPhone) return null;
  return (
    <a
      className={compact ? 'icon-btn h-12 w-12 shrink-0 border-[#25D366]/40' : 'btn-secondary border-[#25D366]/50'}
      href={waLink(o.clientPhone, readyMessage(o))}
      target="_blank"
      rel="noreferrer"
      aria-label="Avisar pelo WhatsApp"
    >
      <WhatsAppLogo size={22} /> {!compact && 'Avisar no WhatsApp'}
    </a>
  );
}

/** Cartão do carro no Kanban do pátio: placa grande, serviços e botões grandes de voltar/avançar. */
export function YardCard({ o, onOpen, onChanged }: { o: Order; onOpen: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const next = nextStatus(o.status);
  const prev = o.status === 'waiting' ? null : prevStatus(o.status);

  async function go(to: string | null) {
    if (!to) return;
    setBusy(true);
    try {
      await moveOrder(o, to);
      onChanged();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card min-w-0 p-4">
      <button className="block w-full min-w-0 text-left" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <Plate plate={o.plate} />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm text-muted">OS {o.number}</p>
            <p className="text-sm font-bold">{o.box?.name || 'Sem box'}</p>
          </div>
        </div>
        <p className="mt-3 truncate text-lg font-bold">
          {o.model || 'Carro'} <span className="text-base font-normal text-muted">· {sizeLabel(o.size)}</span>
        </p>
        <p className="truncate text-sm text-soft">{o.items.map((i) => i.name).join(' + ')}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="truncate">{o.clientName || 'Cliente avulso'}</span>
          <span>· {o.time}</span>
          {o.employee && <span>· {o.employee.name.split(' ')[0]}</span>}
          <span className={`font-bold ${o.paymentStatus === 'paid' ? 'text-ok' : 'text-warn'}`}>· {o.paymentStatus === 'paid' ? 'Pago' : brl(o.dueCents)}</span>
        </p>
      </button>
      <div className="mt-4 flex gap-2">
        {prev && (
          <button className="icon-btn h-14 w-14 shrink-0" aria-label={`Voltar para ${STATUS[prev].label}`} disabled={busy} onClick={() => go(prev)}>
            <ChevronLeft size={26} />
          </button>
        )}
        {o.status === 'ready' && <WhatsAppButton o={o} compact />}
        {next && (
          <button className="btn-primary min-h-[56px] min-w-0 flex-1 gap-1 px-2 text-[clamp(14px,4vw,16px)]" aria-label={ADVANCE[o.status]} disabled={busy} onClick={() => go(next)}>
            <span className="truncate">{ADVANCE_SHORT[o.status]}</span> <ChevronRight size={22} className="shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}

const PAY = ['cash', 'pix', 'card'];
const AREAS: Record<string, string> = {
  frente: 'Frente',
  traseira: 'Traseira',
  lateral_esq: 'Lateral esquerda',
  lateral_dir: 'Lateral direita',
  teto: 'Teto',
  interior: 'Interior',
  rodas: 'Rodas',
  vidros: 'Vidros',
};
const DAMAGES: Record<string, string> = { risco: 'Risco', amassado: 'Amassado', trinca: 'Trinca', mancha: 'Mancha', faltando: 'Peça faltando', outro: 'Outro' };
type Damage = { area: string; type: string; note: string };

/** Foto da vistoria baixada com o token da equipe. */
function StaffPhoto({ id, onRemove }: { id: string; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let u = '';
    fetchImageUrl(`/inspection-photos/${id}`)
      .then((x) => setUrl((u = x)))
      .catch(() => setUrl(''));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[14px] bg-surface2">
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Foto da vistoria" className="h-full w-full object-cover" />
        </a>
      )}
      <button className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-bg/80 text-danger" aria-label="Apagar foto" onClick={onRemove}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Inspection({ o, initial, onChanged }: { o: Order; initial: { damages: Damage[]; notes: string }; onChanged: () => void }) {
  const [damages, setDamages] = useState<Damage[]>(initial.damages);
  const [notes, setNotes] = useState(initial.notes);
  const [busy, setBusy] = useState(false);

  async function addPhoto(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await api.post(`/staff/orders/${o.id}/photos`, { image: await resizeImage(file, 1280) });
      toast('Foto adicionada');
      onChanged();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(id: string) {
    if (!confirm('Apagar esta foto?')) return;
    await api.del(`/staff/photos/${id}`).catch((e) => toast((e as Error).message, true));
    onChanged();
  }

  async function save() {
    setBusy(true);
    try {
      await api.put(`/staff/orders/${o.id}/inspection`, { damages, notes });
      toast('Vistoria salva');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-line p-4">
      <p className="mb-3 font-bold">Vistoria de entrada</p>
      <div className="grid grid-cols-4 gap-2">
        {o.photos.map((p) => (
          <StaffPhoto key={p} id={p} onRemove={() => removePhoto(p)} />
        ))}
        {o.photos.length < 4 && (
          <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line2 text-center text-xs text-muted ${busy ? 'opacity-50' : ''}`}>
            <Camera size={22} /> Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                addPhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Até 4 fotos (reduzidas no aparelho antes de enviar).</p>

      <div className="mt-4 grid gap-2">
        {damages.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <select className="input min-h-[48px] px-3" value={d.area} aria-label="Local" onChange={(e) => setDamages(damages.map((x, j) => (j === i ? { ...x, area: e.target.value } : x)))}>
              {Object.entries(AREAS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select className="input min-h-[48px] px-3" value={d.type} aria-label="Avaria" onChange={(e) => setDamages(damages.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
              {Object.entries(DAMAGES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button className="icon-btn h-12 w-12" aria-label="Remover avaria" onClick={() => setDamages(damages.filter((_, j) => j !== i))}>
              <X size={18} />
            </button>
            <input
              className="input col-span-3 min-h-[48px]"
              placeholder="Detalhe (opcional)"
              maxLength={200}
              value={d.note}
              onChange={(e) => setDamages(damages.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
            />
          </div>
        ))}
        <button className="btn-secondary min-h-[48px]" onClick={() => setDamages([...damages, { area: 'frente', type: 'risco', note: '' }])}>
          + Marcar avaria
        </button>
        <textarea className="input min-h-[70px]" placeholder="Observações da vistoria" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn-primary min-h-[48px]" disabled={busy} onClick={save}>
          Salvar vistoria
        </button>
      </div>
    </section>
  );
}

/** Ficha da OS com as ações da equipe. */
export function OrderSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const full = useApi<{ order: Order; inspection: { damages: Damage[]; notes: string }; loyalty: Loyalty | null }>(id ? `/staff/orders/${id}` : null);
  const catalog = useApi<Catalog>(id ? '/staff/catalog' : null);
  const [mode, setMode] = useState<'view' | 'pay' | 'cancel'>('view');
  const [method, setMethod] = useState('pix');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode('view');
    setErr('');
    setReason('');
  }, [id]);

  if (!id) return null;
  const o = full.data?.order;

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      if (ok) toast(ok);
      setMode('view');
      await full.reload();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={o ? `OS ${o.number}` : 'OS'}>
      {!o && <Loading />}
      {o && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Plate plate={o.plate} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{o.model || 'Carro'}</p>
              <p className="truncate text-sm text-muted">{[o.color, sizeLabel(o.size)].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusPill status={o.status} />
            <span className="text-muted">
              {fmtShort(o.date, o.time)} · {duration(o.durationMin)} · {o.box?.name || 'sem box'}
            </span>
          </div>
          <div className="divide-y divide-line rounded-2xl bg-surface2">
            {[
              ['Cliente', o.clientName || 'Avulso'],
              ...(o.clientPhone ? [['Celular', maskPhone(o.clientPhone)]] : []),
              ...o.items.map((i) => [i.name, brl(i.priceCents)]),
              ...(o.discountCents ? [['Fidelidade (grátis)', `- ${brl(o.discountCents)}`]] : []),
              ['Total', brl(o.dueCents)],
              ['Pagamento', o.paymentStatus === 'paid' ? `Pago · ${METHOD[o.paidMethod] || o.paidMethod}` : 'A receber (no local)'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="min-w-0 text-muted">{k}</span>
                <span className="shrink-0 break-words text-right">{v}</span>
              </div>
            ))}
          </div>
          {o.notes && <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-surface2 p-4 text-soft">{o.notes}</p>}
          {o.cancelReason && o.status === 'cancelled' && <p className="mt-3 text-muted">Motivo: {o.cancelReason}</p>}

          {o.status !== 'cancelled' && catalog.data && (
            <div className="mt-4">
            <Field label="Quem lavou (comissão)">
              <select
                className="input mt-0"
                value={o.employee?.id || ''}
                onChange={(e) => run(() => api.put(`/staff/orders/${o.id}/employee`, { employeeId: e.target.value || null }), 'Responsável atualizado')}
              >
                <option value="">Ninguém ainda (quem começar a lavar)</option>
                {catalog.data.team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            </div>
          )}

          {full.data?.loyalty && o.status !== 'cancelled' && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-tint p-4">
              <Gift className="shrink-0 text-accent" />
              <p className="min-w-0 flex-1 text-sm text-soft">
                Fidelidade: {full.data.loyalty.stamps}/{full.data.loyalty.goal} selos · {full.data.loyalty.rewards} grátis
              </p>
              {full.data.loyalty.rewards > 0 && !o.rewardUsed && o.paymentStatus !== 'paid' && (
                <button className="btn-pill min-h-[44px] px-4 text-sm" disabled={busy} onClick={() => run(() => api.post(`/staff/orders/${o.id}/redeem`), 'Lavagem grátis aplicada')}>
                  Usar grátis
                </button>
              )}
            </div>
          )}

          {o.status !== 'cancelled' && o.status !== 'scheduled' && full.data && <Inspection key={o.photos.join()} o={o} initial={full.data.inspection} onChanged={full.reload} />}

          {mode === 'pay' && (
            <div className="mt-5 grid gap-3">
              <p className="font-bold">Receber {brl(o.dueCents)}</p>
              <div className="grid grid-cols-3 gap-2">
                {PAY.map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={`chip w-full px-2 ${method === m ? 'chip-on' : ''}`}>
                    {METHOD[m]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'cancel' && (
            <div className="mt-5">
              <Field label="Motivo (enviado ao cliente)">
                <input className="input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            </div>
          )}
          <div className="mt-4">
            <FormError message={err} />
          </div>

          <div className="mt-4 grid gap-3">
            {mode === 'view' && (
              <>
                {nextStatus(o.status) && (
                  <button className="btn-primary" disabled={busy} onClick={() => run(() => moveOrder(o, nextStatus(o.status)!))}>
                    {ADVANCE[o.status]} <ChevronRight size={20} />
                  </button>
                )}
                {prevStatus(o.status) && o.status !== 'delivered' && (
                  <button className="btn-secondary" disabled={busy} onClick={() => run(() => moveOrder(o, prevStatus(o.status)!))}>
                    <ChevronLeft size={20} /> Voltar para {STATUS[prevStatus(o.status)!].label}
                  </button>
                )}
                {o.status === 'ready' && <WhatsAppButton o={o} />}
                {o.paymentStatus === 'pending' && o.status !== 'cancelled' && (
                  <button className="btn-secondary" onClick={() => setMode('pay')}>
                    Registrar pagamento
                  </button>
                )}
                {o.paymentStatus === 'paid' && user?.role === 'admin' && (
                  <button className="btn-secondary" disabled={busy} onClick={() => confirm('Estornar o pagamento? A entrada sai do caixa.') && run(() => api.post(`/staff/orders/${o.id}/unpay`), 'Pagamento estornado')}>
                    Estornar pagamento
                  </button>
                )}
                {!['delivered', 'cancelled'].includes(o.status) && o.paymentStatus !== 'paid' && (
                  <button className="btn-danger" onClick={() => setMode('cancel')}>
                    Cancelar OS
                  </button>
                )}
              </>
            )}
            {mode === 'pay' && (
              <button className="btn-primary" disabled={busy} onClick={() => run(() => api.post(`/staff/orders/${o.id}/pay`, { method }), 'Pagamento registrado')}>
                Confirmar recebimento
              </button>
            )}
            {mode === 'cancel' && (
              <button className="btn-danger" disabled={busy} onClick={() => run(() => api.post(`/staff/orders/${o.id}/cancel`, { reason }), 'OS cancelada')}>
                Confirmar cancelamento
              </button>
            )}
            {mode !== 'view' && (
              <button className="btn-secondary" onClick={() => setMode('view')}>
                Voltar
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

/** OS pelo balcão: avulsa (entra direto na fila do pátio) ou agendada para outro horário. */
export function NewOrderSheet({ open, onClose, onCreated, scheduleDefault }: { open: boolean; onClose: () => void; onCreated: (o: Order) => void; scheduleDefault?: string }) {
  const config = useConfig();
  const catalog = useApi<Catalog>(open ? '/staff/catalog' : null);
  const empty = { plate: '', model: '', color: '', size: '' as Size | '', clientName: '', clientPhone: '', serviceId: '', addonIds: [] as string[], notes: '', date: '', time: '' };
  const [f, setF] = useState(empty);
  const [later, setLater] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [lookup, setLookup] = useState<Vehicle[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ ...empty, date: scheduleDefault || '' });
      setLater(!!scheduleDefault);
      setErr('');
      setLookup([]);
    }
  }, [open, scheduleDefault]);

  // Busca a placa/celular já conhecidos para preencher o resto.
  useEffect(() => {
    const q = f.plate.length >= 3 ? f.plate : '';
    if (!open || !q) return setLookup([]);
    const t = setTimeout(() => {
      api
        .get<{ vehicles: Vehicle[] }>(`/staff/lookup?q=${encodeURIComponent(q)}`)
        .then((r) => setLookup(r.vehicles.filter((v) => v.plate !== f.plate.replace(/[^A-Z0-9]/g, '') || !f.size)))
        .catch(() => setLookup([]));
    }, 300);
    return () => clearTimeout(t);
  }, [f.plate, f.size, open]);

  const services = catalog.data?.services || [];
  const size = f.size || null;
  const total = useMemo(() => {
    if (!size) return 0;
    return [f.serviceId, ...f.addonIds].reduce((t, id) => {
      const s = services.find((x) => x.id === id);
      return t + (s ? priceFor(s, size) ?? 0 : 0);
    }, 0);
  }, [f.serviceId, f.addonIds, size, services]);

  useEffect(() => {
    setSlots(null);
    if (!later || !f.date || !f.serviceId || !f.size) return;
    let alive = true;
    api
      .get<{ slots: Slot[] }>(`/staff/availability?date=${f.date}&size=${f.size}&serviceId=${f.serviceId}&addons=${f.addonIds.join(',')}`)
      .then((r) => alive && setSlots(r.slots))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [later, f.date, f.serviceId, f.addonIds, f.size]);

  async function submit() {
    if (!isValidPlate(f.plate)) return setErr('Placa inválida (ABC-1234 ou ABC1D23)');
    if (!f.size) return setErr('Escolha o porte');
    if (!f.serviceId) return setErr('Escolha o serviço');
    if (f.clientPhone && !isValidPhone(f.clientPhone)) return setErr('Celular inválido');
    if (later && (!f.date || !f.time)) return setErr('Escolha o dia e o horário');
    setBusy(true);
    setErr('');
    try {
      const body = { ...f, date: later ? f.date : undefined, time: later ? f.time : undefined };
      const r = await api.post<{ order: Order }>('/staff/orders', body);
      toast(later ? `Agendado: OS ${r.order.number}` : `OS ${r.order.number} na fila · ${r.order.box?.name || 'sem box livre'}`);
      onCreated(r.order);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const mains = services.filter((s) => s.kind === 'main');
  const extras = services.filter((s) => s.kind === 'addon');

  return (
    <Sheet open={open} onClose={onClose} title={later ? 'Novo agendamento' : 'OS avulsa'}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface2 p-1" role="tablist">
          {[false, true].map((v) => (
            <button key={String(v)} role="tab" aria-selected={later === v} onClick={() => setLater(v)} className={`min-h-[44px] rounded-xl text-base font-medium ${later === v ? 'bg-accent font-bold text-bg' : 'text-soft'}`}>
              {v ? 'Agendar' : 'Agora (fila)'}
            </button>
          ))}
        </div>
        <Field label="Placa *">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-11 font-mono uppercase tracking-[0.08em]"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC1D23"
              value={f.plate}
              onChange={(e) => setF({ ...f, plate: maskPlate(e.target.value) })}
            />
          </div>
        </Field>
        {lookup.length > 0 && (
          <div className="-mt-2 grid gap-2">
            {lookup.slice(0, 3).map((v) => (
              <button
                key={v.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface2 p-3 text-left"
                onClick={() => {
                  setF({ ...f, plate: maskPlate(v.plate), model: v.model, color: v.color, size: v.size, clientName: v.clientName || f.clientName, clientPhone: v.phone || f.clientPhone });
                  setLookup([]);
                }}
              >
                <Plate plate={v.plate} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {v.model || 'Carro'} · {v.clientName || v.phone || 'avulso'}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modelo">
            <input className="input" maxLength={60} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
          </Field>
          <Field label="Cor">
            <input className="input" maxLength={30} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
          </Field>
        </div>
        <div>
          <span className="label">Porte *</span>
          <SizePicker value={f.size} onChange={(s) => setF({ ...f, size: s })} />
        </div>
        <Field label="Serviço *">
          <select className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value, time: '' })}>
            <option value="">Selecione</option>
            {mains.map((s) => {
              const p = size ? priceFor(s, size) : null;
              return (
                <option key={s.id} value={s.id} disabled={!!size && p === null}>
                  {s.name}
                  {p !== null ? ` · ${brl(p)}` : ''}
                </option>
              );
            })}
          </select>
        </Field>
        {extras.length > 0 && (
          <div>
            <span className="label">Adicionais</span>
            <div className="grid gap-1 sm:grid-cols-2">
              {extras.map((s) => {
                const p = size ? priceFor(s, size) : null;
                if (size && p === null) return null;
                const on = f.addonIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex min-h-[44px] items-center gap-3 text-left"
                    onClick={() => setF({ ...f, addonIds: on ? f.addonIds.filter((a) => a !== s.id) : [...f.addonIds, s.id], time: '' })}
                  >
                    <Checkbox on={on} />
                    <span className="min-w-0 flex-1">
                      {s.name}
                      {p !== null && <span className="text-muted"> · {brl(p)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do cliente">
            <input className="input" maxLength={100} value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} />
          </Field>
          <Field label={later ? 'Celular *' : 'Celular (selos e WhatsApp)'}>
            <input className="input" type="tel" inputMode="tel" placeholder="(45) 99123-4567" value={f.clientPhone} onChange={(e) => setF({ ...f, clientPhone: maskPhone(e.target.value) })} />
          </Field>
        </div>
        {later && (
          <>
            <Field label="Data">
              <input className="input" type="date" min={config?.today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, time: '' })} />
            </Field>
            {slots && (
              <div>
                <span className="label">Horário</span>
                {slots.every((s) => !s.available) ? (
                  <p className="text-muted">Sem horários com box livre nesse dia.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setF({ ...f, time: s.time })}
                        className={`min-h-[48px] rounded-xl border text-sm font-bold ${f.time === s.time ? 'border-accent bg-accent text-bg' : s.available ? 'border-line bg-surface2' : 'border-transparent text-dis line-through'}`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <Field label="Observações">
          <textarea className="input min-h-[70px]" maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <FormError message={err} />
        <button className="btn-primary" disabled={busy} onClick={submit}>
          {busy ? 'Salvando…' : later ? `Agendar${total ? ` · ${brl(total)}` : ''}` : `Abrir OS${total ? ` · ${brl(total)}` : ''}`}
        </button>
      </div>
    </Sheet>
  );
}
