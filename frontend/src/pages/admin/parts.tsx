import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Gift, MessageCircle, MoreHorizontal, Phone, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { api, fetchImageUrl, useApi, type Box, type Loyalty, type Order, type Service, type Size, type Slot, type Vehicle } from '../../api';
import { useAuth } from '../../auth';
import { isValidPhone, maskPhone } from '../../client';
import { useConfig } from '../../config';
import { WhatsAppLogo } from '../../brand-icons';
import { ActionSheet, Checkbox, InfoRow, Empty, FormError, Field, Loading, Plate, Sheet, SizePicker, StatusPill, toast, type SheetAction } from '../../ui';
import {
  brl,
  duration,
  fmtShort,
  formatPlate,
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
  TRACK_STEPS,
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
      className={
        compact
          ? 'flex h-14 w-14 shrink-0 items-center justify-center rounded-cell bg-[#25D366]/15 transition-opacity active:opacity-60'
          : 'flex min-h-[50px] items-center justify-center gap-2 rounded-cell bg-[#25D366]/15 px-5 text-body font-semibold text-ink transition-opacity active:opacity-60'
      }
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
    <div className="card relative min-w-0 overflow-hidden p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${STATUS[o.status].bar}`} aria-hidden />
      <button className="block w-full min-w-0 text-left" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <Plate plate={o.plate} />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-footnote text-muted">OS {o.number}</p>
            <p className="truncate text-subhead font-semibold">{o.box?.name || 'Sem box'}</p>
          </div>
        </div>
        <p className="mt-3 truncate text-body font-semibold">
          {o.model || 'Carro'} <span className="font-normal text-muted">· {sizeLabel(o.size)}</span>
        </p>
        <p className="truncate text-subhead text-soft">{o.items.map((i) => i.name).join(' + ')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-muted">
          <span className="truncate">{o.clientName || 'Cliente avulso'}</span>
          <span>· {o.time}</span>
          {o.employee && <span>· {o.employee.name.split(' ')[0]}</span>}
          <span className={`rounded-full px-2 py-0.5 font-semibold ${o.paymentStatus === 'paid' ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}>
            {o.paymentStatus === 'paid' ? 'Pago' : brl(o.dueCents)}
          </span>
        </div>
      </button>
      <div className="mt-4 flex gap-2">
        {prev && (
          <button
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-cell bg-surface2 text-ink transition-opacity active:opacity-60 disabled:opacity-40"
            aria-label={`Voltar para ${STATUS[prev].label}`}
            disabled={busy}
            onClick={() => go(prev)}
          >
            <ChevronLeft size={26} />
          </button>
        )}
        {o.status === 'ready' && <WhatsAppButton o={o} compact />}
        {next && (
          <button className="btn-primary min-h-[56px] min-w-0 flex-1 gap-1 px-2" aria-label={ADVANCE[o.status]} disabled={busy} onClick={() => go(next)}>
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
    <div className="relative aspect-square overflow-hidden rounded-[12px] bg-surface2">
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Foto da vistoria" className="h-full w-full object-cover" />
        </a>
      )}
      <button className="absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1.5" aria-label="Apagar foto" onClick={onRemove}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"><Trash2 size={14} /></span>
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

  const setDamage = (i: number, patch: Partial<Damage>) => setDamages(damages.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <section>
        <p className="group-title">Fotos · {o.photos.length} de 4</p>
        <div className="grid grid-cols-4 gap-2">
          {o.photos.map((p) => (
            <StaffPhoto key={p} id={p} onRemove={() => removePhoto(p)} />
          ))}
          {o.photos.length < 4 && (
            <label
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-[1.5px] border-dashed border-accent/50 bg-tint/60 text-center text-footnote font-medium text-accent transition-opacity active:opacity-60 ${busy ? 'opacity-50' : ''}`}
            >
              <Camera size={22} strokeWidth={1.75} /> Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void addPhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        <p className="mt-2 px-1 text-footnote text-muted">Até 4 fotos (reduzidas no aparelho antes de enviar).</p>
      </section>

      <section>
        <p className="group-title">Avarias · {damages.length}</p>
        <div className="grid gap-2.5">
          {damages.length === 0 && <p className="card px-4 py-3.5 text-subhead text-muted">Nenhuma avaria marcada.</p>}
          {damages.map((d, i) => (
            <div key={i} className="card grid grid-cols-2 gap-2 p-3">
              <div className="col-span-2 -mt-1 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warnbg text-caption font-semibold text-warn">{i + 1}</span>
                <span className="min-w-0 flex-1 text-subhead font-semibold">Avaria {i + 1}</span>
                <button className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center text-danger active:opacity-50" aria-label="Remover avaria" onClick={() => setDamages(damages.filter((_, j) => j !== i))}>
                  <Trash2 size={19} strokeWidth={1.75} />
                </button>
              </div>
                <select className="input min-h-[44px] min-w-0 px-3 text-subhead" value={d.area} aria-label="Local" onChange={(e) => setDamage(i, { area: e.target.value })}>
                  {Object.entries(AREAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select className="input min-h-[44px] min-w-0 px-3 text-subhead" value={d.type} aria-label="Avaria" onChange={(e) => setDamage(i, { type: e.target.value })}>
                  {Object.entries(DAMAGES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              <input className="input col-span-2 min-h-[44px] text-subhead" placeholder="Detalhe (opcional)" maxLength={200} value={d.note} onChange={(e) => setDamage(i, { note: e.target.value })} />
            </div>
          ))}
          <button className="btn-text justify-center font-semibold" onClick={() => setDamages([...damages, { area: 'frente', type: 'risco', note: '' }])}>
            <Plus size={20} /> Marcar avaria
          </button>
        </div>
      </section>

      <section>
        <p className="group-title">Observações</p>
        <textarea className="input min-h-[84px] resize-y" placeholder="Ex.: arranhão antigo na porta, já avisado ao cliente" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn-secondary mt-3 w-full" disabled={busy} onClick={save}>
          Salvar vistoria
        </button>
      </section>
    </div>
  );
}

/** Etapas resumidas da OS (Agendado → Pronto) e a próxima. */
function MiniTracker({ o }: { o: Order }) {
  if (o.status === 'cancelled') return null;
  const idx = o.status === 'delivered' ? TRACK_STEPS.length - 1 : TRACK_STEPS.findIndex((t) => t.status === o.status);
  const done = o.status === 'ready' || o.status === 'delivered';
  const next = TRACK_STEPS[idx + 1];
  return (
    <div className="mt-3" aria-label={`Etapa ${idx + 1} de ${TRACK_STEPS.length}`}>
      <div className="grid grid-cols-5 gap-1">
        {TRACK_STEPS.map((t, i) => (
          <span key={t.status} className={`h-1 rounded-full transition-colors duration-300 ${i <= idx ? (done ? 'bg-okfill' : 'bg-brand') : 'bg-surface2'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-footnote text-muted">
        Etapa {idx + 1} de {TRACK_STEPS.length}
        {o.status === 'delivered' ? ' · entregue' : next ? ` · próxima: ${next.label}` : ' · aguardando retirada'}
      </p>
    </div>
  );
}

type Tab = 'resumo' | 'vistoria' | 'pagamento';

/** Ficha da OS: cabeçalho fixo, abas (Resumo · Vistoria · Pagamento) e a ação da etapa no rodapé. */
export function OrderSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const full = useApi<{ order: Order; inspection: { damages: Damage[]; notes: string }; loyalty: Loyalty | null }>(id ? `/staff/orders/${id}` : null);
  const catalog = useApi<Catalog>(id ? '/staff/catalog' : null);
  const [tab, setTab] = useState<Tab>('resumo');
  const [method, setMethod] = useState('pix');
  const [more, setMore] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab('resumo');
    setErr('');
    setReason('');
    setCancelling(false);
    setMore(false);
  }, [id]);

  if (!id) return null;
  const o = full.data?.order;

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      if (ok) toast(ok);
      setCancelling(false);
      await full.reload();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!o)
    return (
      <Sheet open onClose={onClose} title="OS" tall>
        {full.error ? <FormError message={full.error} /> : <Loading />}
      </Sheet>
    );

  const next = nextStatus(o.status);
  const prev = o.status !== 'delivered' ? prevStatus(o.status) : null;
  const pending = o.paymentStatus === 'pending' && o.status !== 'cancelled';
  const canInspect = o.status !== 'cancelled' && o.status !== 'scheduled';
  const inspCount = o.photos.length + (full.data?.inspection.damages.length || 0);

  const actions: SheetAction[] = [];
  if (prev) actions.push({ label: `Voltar para ${STATUS[prev].label}`, icon: ChevronLeft, onClick: () => run(() => moveOrder(o, prev)) });
  if (pending && tab !== 'pagamento') actions.push({ label: 'Registrar pagamento', icon: Wallet, onClick: () => setTab('pagamento') });
  if (o.status === 'ready' && o.clientPhone) actions.push({ label: 'Avisar no WhatsApp', icon: MessageCircle, onClick: () => window.open(waLink(o.clientPhone, readyMessage(o)), '_blank') });
  if (!['delivered', 'cancelled'].includes(o.status) && o.paymentStatus !== 'paid')
    actions.push({ label: 'Cancelar OS', destructive: true, onClick: () => setCancelling(true) });

  const header = (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <span className="min-[380px]:hidden">
          <Plate plate={o.plate} size="sm" />
        </span>
        <span className="hidden min-[380px]:inline-flex">
          <Plate plate={o.plate} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold leading-snug">
            {o.model || 'Carro'} <span className="font-normal text-muted">· {sizeLabel(o.size)}</span>
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill status={o.status} />
            <span className="truncate text-footnote text-muted">
              {fmtShort(o.date, o.time)} · {o.box?.name || 'sem box'}
            </span>
          </div>
        </div>
      </div>
      <MiniTracker o={o} />
      <div className="segmented mt-3 grid-cols-3" role="tablist" aria-label="Seções da OS">
        {(
          [
            ['resumo', 'Resumo'],
            ['vistoria', inspCount ? `Vistoria · ${inspCount}` : 'Vistoria'],
            ['pagamento', 'Pagamento'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`segment relative ${tab === k ? 'segment-on' : ''}`}>
            {label}
            {k === 'pagamento' && pending && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" aria-label="a receber" />}
          </button>
        ))}
      </div>
    </div>
  );

  const footer =
    next || actions.length ? (
      <>
        {err && (
          <div className="mb-3">
            <FormError message={err} />
          </div>
        )}
        <div className="flex gap-2">
          {next && (
            <button className="btn-primary min-w-0 flex-1" disabled={busy} onClick={() => run(() => moveOrder(o, next))}>
              <span className="truncate">{ADVANCE[o.status]}</span> <ChevronRight size={20} className="shrink-0" />
            </button>
          )}
          {actions.length > 0 && (
            <button
              className={`flex min-h-[50px] items-center justify-center gap-2 rounded-cell bg-surface2 text-ink transition-opacity active:opacity-60 ${next ? 'w-[50px] shrink-0' : 'flex-1'}`}
              aria-label="Mais ações"
              onClick={() => setMore(true)}
            >
              <MoreHorizontal size={22} />
              {!next && <span className="text-body font-semibold">Ações</span>}
            </button>
          )}
        </div>
      </>
    ) : undefined;

  return (
    <Sheet open onClose={onClose} title={`OS ${o.number}`} header={header} footer={footer} tall>
      {tab === 'resumo' && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
          <section>
            <p className="group-title">Cliente</p>
            <div className="list">
              <InfoRow label="Nome">{o.clientName || 'Avulso'}</InfoRow>
              {o.clientPhone && (
                <div className="cell gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-footnote text-muted">Celular</span>
                    <span className="block truncate tabular-nums">{maskPhone(o.clientPhone)}</span>
                  </span>
                  <a href={`tel:${o.clientPhone.replace(/\D/g, '')}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-accent active:opacity-60" aria-label="Ligar">
                    <Phone size={18} strokeWidth={2} />
                  </a>
                  <a href={waLink(o.clientPhone)} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 active:opacity-60" aria-label="Conversar no WhatsApp">
                    <WhatsAppLogo size={19} />
                  </a>
                </div>
              )}
            </div>
          </section>

          <section>
            <p className="group-title">Serviços · {duration(o.durationMin)}</p>
            <div className="list">
              {o.items.map((i) => (
                <InfoRow key={i.id} label={i.name}>
                  {brl(i.priceCents)}
                </InfoRow>
              ))}
              {o.discountCents > 0 && <InfoRow label="Fidelidade (grátis)">- {brl(o.discountCents)}</InfoRow>}
              <InfoRow label="Total" strong>
                {brl(o.dueCents)}
              </InfoRow>
            </div>
          </section>

          {(o.notes || (o.cancelReason && o.status === 'cancelled')) && (
            <section>
              <p className="group-title">Observações</p>
              {o.notes && <p className="card whitespace-pre-wrap break-words p-4 text-subhead text-soft">{o.notes}</p>}
              {o.cancelReason && o.status === 'cancelled' && <p className="mt-2 px-1 text-subhead text-danger">Motivo do cancelamento: {o.cancelReason}</p>}
            </section>
          )}

          {o.status !== 'cancelled' && catalog.data && (
            <section>
              <p className="group-title">Quem lavou (comissão)</p>
              <select
                className="input"
                aria-label="Quem lavou"
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
            </section>
          )}

          {full.data?.loyalty && o.status !== 'cancelled' && (
            <section>
              <p className="group-title">Fidelidade</p>
              <div className="card flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: 'linear-gradient(150deg,#1FA2E6,#0A6CD6)' }}>
                  <Gift size={20} />
                </span>
                <p className="min-w-0 flex-1 text-subhead">
                  <span className="block font-semibold">
                    {full.data.loyalty.stamps} de {full.data.loyalty.goal} selos
                  </span>
                  <span className="text-muted">{full.data.loyalty.rewards} grátis disponível(is)</span>
                </p>
                {full.data.loyalty.rewards > 0 && !o.rewardUsed && o.paymentStatus !== 'paid' && (
                  <button className="btn-pill min-h-[36px] px-3.5" disabled={busy} onClick={() => run(() => api.post(`/staff/orders/${o.id}/redeem`), 'Lavagem grátis aplicada')}>
                    Usar grátis
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* A vistoria fica montada (só escondida) para não perder o que foi digitado ao trocar de aba. */}
      {full.data && canInspect && (
        <div className={tab === 'vistoria' ? '' : 'hidden'}>
          <Inspection key={o.photos.join()} o={o} initial={full.data.inspection} onChanged={full.reload} />
        </div>
      )}
      {tab === 'vistoria' && !canInspect && (
        <Empty icon={Camera} title="Vistoria indisponível" text={o.status === 'cancelled' ? 'A OS foi cancelada.' : 'A vistoria de entrada começa quando o carro chega ao pátio.'} />
      )}

      {tab === 'pagamento' && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
          <div className={`rounded-card p-5 text-center ${o.paymentStatus === 'paid' ? 'bg-okbg' : 'card'}`}>
            <p className="text-footnote text-muted">{o.paymentStatus === 'paid' ? 'Pago' : o.status === 'cancelled' ? 'OS cancelada' : 'A receber no local'}</p>
            <p className={`mt-1 text-[34px] font-bold leading-tight tabular-nums ${o.paymentStatus === 'paid' ? 'text-ok' : ''}`}>{brl(o.dueCents)}</p>
            {o.paymentStatus === 'paid' && <p className="mt-1 text-subhead text-ok">{METHOD[o.paidMethod] || o.paidMethod}</p>}
          </div>

          <div className="list">
            <InfoRow label="Serviços">{brl(o.totalCents)}</InfoRow>
            {o.discountCents > 0 && <InfoRow label="Desconto fidelidade">- {brl(o.discountCents)}</InfoRow>}
            <InfoRow label="Total" strong>
              {brl(o.dueCents)}
            </InfoRow>
          </div>

          {pending && (
            <section>
              <p className="group-title">Forma de pagamento</p>
              <div className="segmented grid-cols-3" role="radiogroup" aria-label="Forma de pagamento">
                {PAY.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`segment ${method === m ? 'segment-on' : ''}`}>
                    {METHOD[m]}
                  </button>
                ))}
              </div>
              <button className="btn-secondary mt-3 w-full" disabled={busy} onClick={() => run(() => api.post(`/staff/orders/${o.id}/pay`, { method }), 'Pagamento registrado')}>
                <Wallet size={20} /> Registrar recebimento de {brl(o.dueCents)}
              </button>
            </section>
          )}
          {o.paymentStatus === 'paid' && user?.role === 'admin' && (
            <button className="btn-danger w-full" disabled={busy} onClick={() => confirm('Estornar o pagamento? A entrada sai do caixa.') && run(() => api.post(`/staff/orders/${o.id}/unpay`), 'Pagamento estornado')}>
              Estornar pagamento
            </button>
          )}
        </div>
      )}

      <ActionSheet open={more} onClose={() => setMore(false)} title={`OS ${o.number} · ${formatPlate(o.plate)}`} actions={actions} />

      {cancelling && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-label="Cancelar OS">
          <button type="button" aria-label="Fechar" className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setCancelling(false)} />
          <div className="relative w-full max-w-[300px] animate-pop-in overflow-hidden rounded-[14px] bg-[rgb(var(--surface)/0.95)] text-center backdrop-blur-xl">
            <div className="px-4 pb-4 pt-5">
              <p className="text-body font-semibold">Cancelar a OS {o.number}?</p>
              <p className="mt-1 text-footnote text-muted">O motivo é enviado ao cliente.</p>
              <input className="input mt-3 min-h-[40px] py-2 text-subhead" autoFocus maxLength={300} placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
              {err && <p className="mt-2 text-footnote text-danger">{err}</p>}
            </div>
            <div className="grid grid-cols-2 hairline-t">
              <button className="min-h-[46px] text-body text-accent active:bg-surface2" onClick={() => setCancelling(false)}>
                Voltar
              </button>
              <button
                className="min-h-[46px] text-body font-semibold text-danger active:bg-surface2"
                style={{ boxShadow: 'inset 0.5px 0 0 rgb(var(--line))' }}
                disabled={busy}
                onClick={() => run(() => api.post(`/staff/orders/${o.id}/cancel`, { reason }), 'OS cancelada')}
              >
                Cancelar OS
              </button>
            </div>
          </div>
        </div>
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
        <div className="segmented grid-cols-2" role="tablist">
          {[false, true].map((v) => (
            <button key={String(v)} role="tab" aria-selected={later === v} onClick={() => setLater(v)} className={`segment ${later === v ? 'segment-on' : ''}`}>
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
                className="card flex items-center gap-3 p-3 text-left active:opacity-70"
                onClick={() => {
                  setF({ ...f, plate: maskPlate(v.plate), model: v.model, color: v.color, size: v.size, clientName: v.clientName || f.clientName, clientPhone: v.phone || f.clientPhone });
                  setLookup([]);
                }}
              >
                <Plate plate={v.plate} size="sm" />
                <span className="min-w-0 flex-1 truncate text-subhead">
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
                        className={`min-h-[44px] rounded-[10px] text-subhead font-semibold tabular-nums transition-colors ${f.time === s.time ? 'bg-brand text-onaccent' : s.available ? 'bg-surface text-ink' : 'text-dis line-through'}`}
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
