import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift } from 'lucide-react';
import { api, type Loyalty, type Order, type Size, type Vehicle } from '../../api';
import { Field, FormError, Plate, Sheet, SizePicker, StatusPill, toast } from '../../ui';
import { dayNum, isValidPlate, maskPlate, monthShort, progress, sizeLabel, TRACK_STEPS, WEEKDAYS_SHORT, weekdayOf } from '../../util';

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/agenda/${order.id}`} className="card flex items-center gap-3 p-4 transition active:scale-[0.99] min-[380px]:gap-4">
      <div className="flex w-[3.75rem] shrink-0 flex-col items-center rounded-2xl bg-surface2 py-2.5">
        <span className="text-sm text-muted">{WEEKDAYS_SHORT[weekdayOf(order.date)]}</span>
        <span className="font-display text-3xl font-extrabold leading-none">{dayNum(order.date)}</span>
        <span className="text-sm uppercase text-muted">{monthShort(order.date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-lg font-bold">{order.items.find((i) => i.kind === 'main')?.name || 'Lavagem'}</p>
        <p className="break-words text-base text-muted">
          {order.model || 'Carro'} · {order.time}
        </p>
        <div className="mt-2">
          <StatusPill status={order.status} />
        </div>
      </div>
    </Link>
  );
}

/** Barra de progresso do acompanhamento ao vivo (Agendado → Pronto). */
export function Tracker({ order }: { order: Order }) {
  const pct = progress(order.status);
  const idx = order.status === 'delivered' ? TRACK_STEPS.length - 1 : TRACK_STEPS.findIndex((s) => s.status === order.status);
  return (
    <div>
      <div className="h-3 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Andamento da lavagem">
        <div className={`h-full rounded-full transition-all duration-700 ${order.status === 'ready' || order.status === 'delivered' ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1">
        {TRACK_STEPS.map((s, i) => {
          const done = i < idx || (i === idx && (order.status === 'ready' || order.status === 'delivered'));
          const now = i === idx;
          return (
            <li key={s.status} className="flex min-w-0 flex-col items-center text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  done ? 'border-ok bg-ok text-bg' : now ? 'border-accent bg-tint2 text-accent' : 'border-line2 text-muted'
                } ${now && !done ? 'animate-pulse' : ''}`}
              >
                {done ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`mt-1.5 text-[clamp(11px,3.2vw,14px)] leading-tight ${now ? 'font-bold text-ink' : 'text-muted'}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Cartão fidelidade em selos. */
export function LoyaltyCard({ loyalty, compact }: { loyalty: Loyalty; compact?: boolean }) {
  const headline =
    loyalty.rewards > 0
      ? loyalty.rewards === 1
        ? 'Você tem 1 lavagem grátis!'
        : `Você tem ${loyalty.rewards} lavagens grátis!`
      : loyalty.remaining === 1
        ? 'Falta só 1 lavagem para ganhar a próxima!'
        : `Faltam ${loyalty.remaining} lavagens para ganhar a próxima`;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-tint px-5 py-4">
        <Gift className="shrink-0 text-accent" size={24} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Cartão fidelidade</p>
          <p className="text-sm text-soft">{headline}</p>
        </div>
        {loyalty.rewards > 0 && <span className="shrink-0 rounded-full bg-ok px-3 py-1 text-sm font-bold text-bg">{loyalty.rewards} grátis</span>}
      </div>
      <div className={`grid grid-cols-5 gap-2 p-5 ${compact ? '' : 'sm:gap-3'}`} aria-label={`${loyalty.stamps} de ${loyalty.goal} selos`}>
        {Array.from({ length: loyalty.goal }, (_, i) => {
          const on = i < loyalty.stamps;
          const last = i === loyalty.goal - 1;
          return (
            <span
              key={i}
              className={`flex aspect-square items-center justify-center rounded-full border-2 text-sm font-bold ${
                on ? 'border-accent bg-accent text-bg' : last ? 'border-dashed border-ok text-ok' : 'border-line2 text-dis'
              }`}
            >
              {on ? <Check size={18} strokeWidth={3} /> : last ? <Gift size={18} /> : i + 1}
            </span>
          );
        })}
      </div>
      {!compact && <p className="px-5 pb-5 text-sm text-muted">A cada lavagem concluída você ganha 1 selo. Completou {loyalty.goal}? A próxima lavagem (serviço principal) é por nossa conta.</p>}
    </div>
  );
}

export function VehicleRow({ v, right, onClick, selected }: { v: Vehicle; right?: ReactNode; onClick?: () => void; selected?: boolean }) {
  const body = (
    <>
      <Plate plate={v.plate} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{v.model || 'Carro'}</p>
        <p className="truncate text-sm text-muted">
          {[v.color, sizeLabel(v.size)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {right}
    </>
  );
  const cls = `flex w-full min-w-0 items-center gap-3 rounded-[20px] border p-4 text-left transition ${selected ? 'border-accent bg-tint' : 'border-line bg-surface'}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:scale-[0.99]`} role="radio" aria-checked={!!selected}>
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
            className="input font-mono uppercase tracking-[0.08em]"
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

