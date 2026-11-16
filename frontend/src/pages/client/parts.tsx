import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Check, ChevronRight, Droplet, Droplets, Gift, Sparkles, Warehouse, type LucideIcon } from 'lucide-react';
import { useConfig } from '../../config';
import { api, type Loyalty, type Order, type Size, type Vehicle } from '../../api';
import { Field, FormError, Plate, Sheet, SizePicker, StatusPill, toast } from '../../ui';
import { dayNum, isValidPlate, maskPlate, monthShort, progress, sizeLabel, TRACK_STEPS, WEEKDAYS_SHORT, weekdayOf } from '../../util';

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/agenda/${order.id}`} className="card flex items-center gap-3 p-3.5 transition-opacity duration-200 active:opacity-70 min-[380px]:gap-4 min-[380px]:p-4">
      <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-surface2 pb-1.5 text-center">
        <span className="w-full bg-brand py-0.5 text-caption font-semibold text-onaccent">{WEEKDAYS_SHORT[weekdayOf(order.date)]}</span>
        <span className="mt-1 text-title2 font-semibold leading-none">{dayNum(order.date)}</span>
        <span className="mt-0.5 text-caption text-muted">{monthShort(order.date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-body font-semibold">{order.items.find((i) => i.kind === 'main')?.name || 'Lavagem'}</p>
        <p className="break-words text-subhead text-muted">
          {order.model || 'Carro'} · {order.time}
        </p>
        <div className="mt-1.5">
          <StatusPill status={order.status} />
        </div>
      </div>
      <ChevronRight size={20} className="chev" />
    </Link>
  );
}

const TRACK_ICONS: LucideIcon[] = [CalendarCheck, Warehouse, Droplets, Sparkles, Check];

/** Progresso do acompanhamento ao vivo (Agendado → Pronto), com ícones e linha contínua. */
export function Tracker({ order }: { order: Order }) {
  const pct = progress(order.status);
  const idx = order.status === 'delivered' ? TRACK_STEPS.length - 1 : TRACK_STEPS.findIndex((s) => s.status === order.status);
  const finished = order.status === 'ready' || order.status === 'delivered';
  const fill = finished ? 'bg-okfill' : 'bg-brand';
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Andamento da lavagem">
      <ol className="relative grid grid-cols-5">
        <span className="absolute left-[10%] right-[10%] top-[17px] h-[3px] rounded-full bg-surface2" aria-hidden />
        <span
          className={`absolute left-[10%] top-[17px] h-[3px] rounded-full transition-[width] duration-700 ease-out ${fill}`}
          style={{ width: `${(Math.max(idx, 0) / (TRACK_STEPS.length - 1)) * 80}%` }}
          aria-hidden
        />
        {TRACK_STEPS.map((s, i) => {
          const reached = i <= idx;
          const now = i === idx && !finished;
          const I = TRACK_ICONS[i];
          return (
            <li key={s.status} className="relative flex min-w-0 flex-col items-center text-center" aria-current={i === idx ? 'step' : undefined}>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 ${
                  reached ? `${fill} text-white` : 'bg-surface2 text-dis'
                } ${now ? 'animate-ring' : ''}`}
              >
                <I size={17} strokeWidth={2.2} />
              </span>
              <span className={`mt-1.5 max-w-full text-[clamp(10.5px,3.1vw,12px)] leading-tight ${i === idx ? 'font-semibold text-ink' : reached ? 'text-soft' : 'text-muted'}`}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Cartão fidelidade no estilo de um passe da Wallet: selos em gota e o prêmio no último espaço. */
export function LoyaltyCard({ loyalty, compact }: { loyalty: Loyalty; compact?: boolean }) {
  const config = useConfig();
  const headline =
    loyalty.rewards > 0
      ? loyalty.rewards === 1
        ? 'Você tem 1 lavagem grátis!'
        : `Você tem ${loyalty.rewards} lavagens grátis!`
      : loyalty.remaining === 1
        ? 'Falta só 1 lavagem para ganhar a próxima!'
        : `Faltam ${loyalty.remaining} lavagens para ganhar a próxima`;
  return (
    <div>
      <div
        className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-[0_12px_28px_-12px_rgba(10,108,214,0.65)] min-[380px]:p-5"
        style={{
          background:
            'radial-gradient(120% 90% at 100% 0%, rgba(120,220,255,0.45), transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(4,40,90,0.55), transparent 60%), linear-gradient(150deg, #0B5DB8 0%, #0A6CD6 45%, #1FA2E6 100%)',
        }}
      >
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-[0.14]" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 30c50-18 100-18 150 0s100 18 150 0 70-14 100-6v36H0z" fill="#fff" />
          <path d="M0 44c60-14 120-14 180 0s120 14 220-4v20H0z" fill="#fff" />
        </svg>
        <div className="relative flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-white/20 ring-1 ring-white/25">
            <Droplet size={20} fill="currentColor" strokeWidth={0} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold leading-tight">Cartão fidelidade</p>
            <p className="truncate text-footnote text-white/75">{config?.studioName || 'Lava Car'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-title2 font-bold leading-none tabular-nums">
              {loyalty.stamps}
              <span className="text-subhead font-medium text-white/70">/{loyalty.goal}</span>
            </p>
            <p className="mt-1 text-caption text-white/75">selos</p>
          </div>
        </div>
        <div className={`relative mt-4 grid grid-cols-5 ${compact ? 'gap-2' : 'gap-2.5 sm:gap-3'}`} aria-label={`${loyalty.stamps} de ${loyalty.goal} selos`}>
          {Array.from({ length: loyalty.goal }, (_, i) => {
            const on = i < loyalty.stamps;
            const last = i === loyalty.goal - 1;
            return (
              <span
                key={i}
                className={`mx-auto flex aspect-square w-full max-w-[52px] items-center justify-center rounded-full ${
                  on ? 'bg-white text-[#0A6CD6] shadow-[0_2px_6px_rgba(0,30,80,0.25)]' : last ? 'border-2 border-dashed border-[#FFD60A] text-[#FFD60A]' : 'border-[1.5px] border-white/35 bg-white/10'
                }`}
              >
                {on ? <Droplet size={18} fill="currentColor" strokeWidth={0} /> : last ? <Gift size={18} strokeWidth={2} /> : null}
              </span>
            );
          })}
        </div>
        <div className="relative mt-4 flex items-center gap-3 border-t border-white/20 pt-3">
          <p className="min-w-0 flex-1 text-subhead font-medium leading-snug">{headline}</p>
          {loyalty.rewards > 0 && (
            <span className="flex min-h-[28px] shrink-0 items-center gap-1 rounded-full bg-white px-3 text-footnote font-bold text-[#0A6CD6]">
              <Gift size={14} strokeWidth={2.4} /> {loyalty.rewards} grátis
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <p className="mt-3 px-4 text-footnote text-muted">
          A cada lavagem concluída você ganha 1 selo. Completou {loyalty.goal}? A próxima lavagem (serviço principal) é por nossa conta.
        </p>
      )}
    </div>
  );
}

export function VehicleRow({ v, right, onClick, selected }: { v: Vehicle; right?: ReactNode; onClick?: () => void; selected?: boolean }) {
  const body = (
    <>
      <Plate plate={v.plate} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{v.model || 'Carro'}</p>
        <p className="truncate text-subhead text-muted">{[v.color, sizeLabel(v.size)].filter(Boolean).join(' · ')}</p>
      </div>
      {right}
    </>
  );
  const cls = `card flex w-full min-w-0 items-center gap-3 p-4 text-left ring-2 transition-[box-shadow] duration-200 ${selected ? 'ring-accent' : 'ring-transparent'}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:opacity-80`} role="radio" aria-checked={!!selected}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Cadastro/edição de um carro da garagem. */
export function VehicleSheet({
  open,
  onClose,
  phone,
  vehicle,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  vehicle?: Vehicle | null;
  onSaved: (v: Vehicle) => void;
}) {
  const [f, setF] = useState({ plate: '', model: '', color: '', size: '' as Size | '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF(vehicle ? { plate: maskPlate(vehicle.plate), model: vehicle.model, color: vehicle.color, size: vehicle.size } : { plate: '', model: '', color: '', size: '' });
      setErr('');
    }
  }, [open, vehicle]);

  async function save() {
    if (!isValidPlate(f.plate)) return setErr('Placa inválida: use ABC-1234 ou o padrão Mercosul ABC1D23');
    if (!f.size) return setErr('Escolha o porte do carro');
    setBusy(true);
    setErr('');
    try {
      const body = { ...f, phone };
      const r = vehicle ? await api.put<{ vehicle: Vehicle }>(`/vehicles/${vehicle.id}`, body) : await api.post<{ vehicle: Vehicle }>('/vehicles', body);
      toast(vehicle ? 'Carro atualizado' : 'Carro adicionado à garagem');
      onSaved(r.vehicle);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={vehicle ? 'Editar carro' : 'Novo carro'}>
      <div className="grid gap-4">
        <Field label="Placa *" hint="Padrão antigo (ABC-1234) ou Mercosul (ABC1D23)">
          <input
            className="input font-mono font-semibold uppercase tracking-[0.08em]"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC1D23"
            value={f.plate}
            onChange={(e) => setF({ ...f, plate: maskPlate(e.target.value) })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modelo">
            <input className="input" maxLength={60} placeholder="Ex.: Onix" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
          </Field>
          <Field label="Cor">
            <input className="input" maxLength={30} placeholder="Ex.: Prata" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
          </Field>
        </div>
        <div>
          <span className="label">Porte *</span>
          <SizePicker value={f.size} onChange={(size) => setF({ ...f, size })} />
        </div>
        <FormError message={err} />
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? 'Salvando…' : 'Salvar carro'}
        </button>
      </div>
    </Sheet>
  );
}

