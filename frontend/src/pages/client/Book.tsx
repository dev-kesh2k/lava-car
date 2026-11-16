import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarFront, ChevronLeft, ChevronRight, Clock, Plus, QrCode, Store } from 'lucide-react';
import { api, useApi, type Order, type Service, type Slot, type Vehicle } from '../../api';
import { getSavedName, getSavedPhone, isValidPhone, maskPhone, saveClient } from '../../client';
import { useConfig } from '../../config';
import { FullPage } from '../../layout';
import { Checkbox, Empty, ErrorBox, Field, FormError, Loading, PageHead, Plate, Radio, ServiceIcon, Stepper } from '../../ui';
import { addDays, brl, duration, fmtDate, fmtLong, MONTHS, priceFor, sizeLabel, WEEKDAYS_SHORT, weekdayOf } from '../../util';
import { VehicleRow, VehicleSheet } from './parts';

function Calendar({ today, value, onChange, schedule }: { today: string; value: string; onChange: (d: string) => void; schedule: { open: boolean }[] }) {
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayOf(`${month}-01`);
  const max = addDays(today, 60);
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button className="icon-btn h-11 w-11 border-transparent bg-transparent disabled:opacity-30" onClick={() => shift(-1)} disabled={month <= today.slice(0, 7)} aria-label="Mês anterior">
          <ChevronLeft size={22} />
        </button>
        <p className="font-display text-xl font-bold uppercase">
          {MONTHS[m - 1]} {y}
        </p>
        <button className="icon-btn h-11 w-11 border-transparent bg-transparent disabled:opacity-30" onClick={() => shift(1)} disabled={month >= max.slice(0, 7)} aria-label="Próximo mês">
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, '0')}`;
          const disabled = day < today || day > max || !schedule[weekdayOf(day)]?.open;
          const sel = day === value;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onChange(day)}
              aria-label={fmtLong(day)}
              aria-pressed={sel}
              className={`mx-auto flex aspect-square w-full max-w-[48px] items-center justify-center rounded-xl text-base font-medium transition ${
                sel ? 'bg-accent font-bold text-bg' : day === today ? 'border border-accent text-ink' : disabled ? 'text-dis' : 'text-ink active:bg-surface2'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Wizard: veículo → serviço principal + adicionais (preço do porte) → data/horário (por boxes livres) → resumo e pagamento. */
export default function Book() {
  const nav = useNavigate();
  const config = useConfig();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(getSavedPhone);
  const [phoneInput, setPhoneInput] = useState(getSavedPhone);
  const [name, setName] = useState(getSavedName);
  const vehicles = useApi<{ vehicles: Vehicle[] }>(phone ? `/vehicles?phone=${encodeURIComponent(phone)}` : null);
  const services = useApi<{ services: Service[] }>('/services');
  const [vehicleId, setVehicleId] = useState('');
  const [sheet, setSheet] = useState(false);
  const [mainId, setMainId] = useState('');
  const [addons, setAddons] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotErr, setSlotErr] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const vehicle = vehicles.data?.vehicles.find((v) => v.id === vehicleId);
  useEffect(() => {
    const list = vehicles.data?.vehicles;
    if (list?.length && !vehicleId) setVehicleId(list[0].id);
  }, [vehicles.data, vehicleId]);

  const size = vehicle?.size;
  const mains = (services.data?.services || []).filter((s) => s.kind === 'main');
  const extras = (services.data?.services || []).filter((s) => s.kind === 'addon');
  const chosen = useMemo(() => {
    if (!size || !services.data) return { items: [] as { s: Service; price: number }[], total: 0, minutes: 0 };
    const items = [mainId, ...addons]
      .map((id) => services.data!.services.find((s) => s.id === id))
      .filter((s): s is Service => !!s && priceFor(s, size) !== null)
      .map((s) => ({ s, price: priceFor(s, size)! }));
    return { items, total: items.reduce((t, i) => t + i.price, 0), minutes: items.reduce((t, i) => t + i.s.durationMin, 0) };
  }, [mainId, addons, size, services.data]);

  // Serviço sem preço para o porte do carro escolhido sai da seleção.
  useEffect(() => {
    if (!size || !services.data) return;
    const ok = (id: string) => {
      const s = services.data!.services.find((x) => x.id === id);
      return !!s && priceFor(s, size) !== null;
    };
    if (mainId && !ok(mainId)) setMainId('');
    setAddons((a) => a.filter(ok));
  }, [size, services.data, mainId]);

  useEffect(() => {
    if (!date || !mainId || !size) return;
    let alive = true;
    setSlots(null);
    setSlotErr('');
    api
      .get<{ slots: Slot[] }>(`/availability?date=${date}&size=${size}&serviceId=${mainId}&addons=${addons.join(',')}`)
      .then((r) => alive && setSlots(r.slots))
      .catch((e) => alive && setSlotErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [date, mainId, addons, size]);

  useEffect(() => {
    if (slots && time && !slots.find((s) => s.time === time)?.available) setTime('');
  }, [slots, time]);

  if (!config || services.loading) return <Loading />;

  function usePhone() {
    if (!isValidPhone(phoneInput)) return setErr('Informe o celular com DDD, ex.: (45) 99123-4567');
    setErr('');
    saveClient(phoneInput);
    setPhone(maskPhone(phoneInput));
  }

  async function submit() {
    setErr('');
    if (!name.trim()) return setErr('Informe seu nome');
    setBusy(true);
    try {
      const r = await api.post<{ order: Order }>('/orders', { phone, name, vehicleId, serviceId: mainId, addonIds: addons, date, time, notes, paymentMethod: 'onsite' });
      saveClient(phone, name);
      nav(`/agenda/${r.order.id}?novo=1`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const canNext = [!!vehicle, !!mainId, !!date && !!time, true][step];
  const back = () => (step === 0 ? nav('/') : setStep(step - 1));
  const free = slots?.filter((s) => s.available).length ?? 0;

  const footer = (
    <>
      {step === 3 && <FormError message={err} />}
      <div className={`flex items-center gap-3 ${step === 3 && err ? 'mt-3' : ''}`}>
        {chosen.total > 0 && (
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{duration(chosen.minutes)}</p>
            <p className="font-display text-2xl font-extrabold leading-none text-accent">{brl(chosen.total)}</p>
          </div>
        )}
        {step < 3 ? (
          <button className={`btn-primary ${chosen.total > 0 ? 'min-w-[9rem]' : 'w-full'}`} disabled={!canNext} onClick={() => setStep(step + 1)}>
            Continuar
          </button>
        ) : (
          <button className="btn-primary min-w-[9rem]" disabled={busy} onClick={submit}>
            {busy ? 'Agendando…' : 'Confirmar'}
          </button>
        )}
      </div>
    </>
  );

  return (
    <FullPage footer={phone ? footer : undefined}>
      <PageHead onBack={back} title={['Seu carro', 'Serviços', 'Data e horário', 'Resumo'][step]} />
      <Stepper step={step} />

      {step === 0 &&
        (!phone ? (
          <div className="card mx-auto flex max-w-md flex-col gap-4 p-6">
            <p className="text-lg font-bold">Qual é o seu celular?</p>
            <p className="-mt-2 text-muted">Sem cadastro: seu celular guarda a garagem, as lavagens e o cartão fidelidade.</p>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(45) 99123-4567" aria-label="Celular com DDD" value={phoneInput} onChange={(e) => setPhoneInput(maskPhone(e.target.value))} />
            <FormError message={err} />
            <button className="btn-primary" onClick={usePhone}>
              Continuar
            </button>
          </div>
        ) : (
          <section>
            <p className="mb-3 flex flex-wrap items-center gap-x-3 text-muted">
              Garagem do celular {phone}
              <button className="min-h-[44px] font-bold text-accent" onClick={() => setPhone('')}>
                Trocar
              </button>
            </p>
            {vehicles.loading && !vehicles.data && <Loading />}
            {vehicles.error && <ErrorBox message={vehicles.error} onRetry={vehicles.reload} />}
            {vehicles.data && vehicles.data.vehicles.length === 0 && <Empty icon={CarFront} title="Nenhum carro na garagem" text="Cadastre a placa e o porte: o preço depende do tamanho do carro." />}
            <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Veículo">
              {vehicles.data?.vehicles.map((v) => (
                <VehicleRow key={v.id} v={v} selected={v.id === vehicleId} onClick={() => setVehicleId(v.id)} right={<Radio on={v.id === vehicleId} />} />
              ))}
            </div>
            <button className="btn-secondary mt-3 w-full md:w-auto" onClick={() => setSheet(true)}>
              <Plus size={20} /> Adicionar carro
            </button>
          </section>
        ))}

      {step === 1 && size && (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <p className="mb-3 text-muted">Preços para {sizeLabel(size)}</p>
            <h2 className="h2 mb-3">Lavagem</h2>
            <div className="flex flex-col gap-3" role="radiogroup" aria-label="Serviço principal">
              {mains.map((s) => {
                const price = priceFor(s, size);
                const on = s.id === mainId;
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={on}
                    disabled={price === null}
                    onClick={() => setMainId(s.id)}
                    className={`flex items-center gap-4 rounded-[20px] border p-4 text-left transition active:scale-[0.99] disabled:opacity-40 ${on ? 'border-accent bg-tint' : 'border-line bg-surface'}`}
                  >
                    <ServiceIcon icon={s.icon} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold">{s.name}</p>
                      {s.description && <p className="text-sm text-muted">{s.description}</p>}
                      <p className="mt-1 text-sm text-soft">
                        {duration(s.durationMin)} · <span className="font-bold text-accent">{price === null ? 'Indisponível para o porte' : brl(price)}</span>
                      </p>
                    </div>
                    <Radio on={on} />
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <h2 className="h2 mb-3 md:mt-[2.25rem]">Adicionais</h2>
            <div className="flex flex-col gap-3">
              {extras.map((s) => {
                const price = priceFor(s, size);
                const on = addons.includes(s.id);
                if (price === null) return null;
                return (
                  <button
                    key={s.id}
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setAddons(on ? addons.filter((a) => a !== s.id) : [...addons, s.id])}
                    className={`flex items-center gap-4 rounded-[20px] border p-4 text-left transition active:scale-[0.99] ${on ? 'border-accent bg-tint' : 'border-line bg-surface'}`}
                  >
                    <ServiceIcon icon={s.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{s.name}</p>
                      <p className="text-sm text-soft">
                        + {duration(s.durationMin)} · <span className="font-bold text-accent">+ {brl(price)}</span>
                      </p>
                    </div>
                    <Checkbox on={on} />
                  </button>
                );
              })}
              {extras.length === 0 && <p className="text-muted">Nenhum adicional disponível.</p>}
            </div>
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Calendar
            today={config.today}
            schedule={config.schedule}
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime('');
            }}
          />
          <section>
            <h2 className="h2 mb-1">{date ? fmtLong(date) : 'Horários'}</h2>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-muted">
              <Clock size={16} /> Duração: {duration(chosen.minutes)}
            </p>
            {!date && <p className="text-muted">Escolha um dia no calendário. Só aparecem horários com box livre durante toda a lavagem.</p>}
            {date && !slots && !slotErr && <Loading label="Buscando horários…" />}
            {slotErr && <ErrorBox message={slotErr} />}
            {slots && free === 0 && <p className="card p-4 text-muted">Sem horários livres neste dia. Tente outra data.</p>}
            {slots && free > 0 && (
              <div className="grid grid-cols-3 gap-2.5 min-[420px]:grid-cols-4" role="radiogroup" aria-label="Horário">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    role="radio"
                    aria-checked={time === s.time}
                    disabled={!s.available}
                    onClick={() => setTime(s.time)}
                    className={`min-h-[52px] rounded-2xl border text-base font-bold transition ${
                      time === s.time ? 'border-accent bg-accent text-bg' : s.available ? 'border-line bg-surface text-ink active:scale-95' : 'border-line/50 bg-transparent text-dis line-through'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {step === 3 && vehicle && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <section className="card divide-y divide-line">
              <div className="flex items-center gap-3 px-5 py-4">
                <Plate plate={vehicle.plate} size="sm" />
                <span className="min-w-0 flex-1 truncate font-bold">{vehicle.model || 'Carro'}</span>
                <span className="shrink-0 text-sm text-muted">{sizeLabel(vehicle.size)}</span>
              </div>
              {chosen.items.map(({ s, price }) => (
                <div key={s.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <span className="min-w-0 text-soft">{s.name}</span>
                  <span className="shrink-0 font-medium">{brl(price)}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="shrink-0 text-muted">Quando</span>
                <span className="min-w-0 text-right font-medium">
                  {WEEKDAYS_SHORT[weekdayOf(date)]}, {fmtDate(date)} · {time}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="font-bold">Total</span>
                <span className="font-display text-2xl font-extrabold text-accent">{brl(chosen.total)}</span>
              </div>
            </section>
            <section>
              <h2 className="h2 mb-3">Seus dados</h2>
              <div className="grid gap-4">
                <Field label="Nome *">
                  <input className="input" autoComplete="name" maxLength={100} placeholder="Como te chamamos" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Observações (opcional)">
                  <textarea className="input min-h-[90px] resize-y" maxLength={500} placeholder="Ex.: cuidado com o adesivo do capô" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </section>
          </div>
          <section>
            <h2 className="h2 mb-3">Pagamento</h2>
            <div className="flex flex-col gap-3" role="radiogroup" aria-label="Forma de pagamento">
              <div className="flex items-center gap-4 rounded-[20px] border border-accent bg-tint p-4" role="radio" aria-checked>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface2 text-accent">
                  <Store size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Pagar no local</span>
                  <span className="block text-sm text-muted">Dinheiro, Pix ou cartão na retirada. Sem sinal.</span>
                </span>
                <Radio on />
              </div>
              {/* Pix antecipado: preparado no backend, liga quando houver gateway (config.pixEnabled). */}
              <div className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4 opacity-50" role="radio" aria-checked={false} aria-disabled>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted">
                  <QrCode size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Pix antecipado</span>
                  <span className="block text-sm text-muted">Em breve</span>
                </span>
                <Radio on={false} />
              </div>
            </div>
          </section>
        </div>
      )}

      <VehicleSheet
        open={sheet}
        onClose={() => setSheet(false)}
        phone={phone}
        onSaved={(v) => {
          setVehicleId(v.id);
          vehicles.reload();
        }}
      />
    </FullPage>
  );
}
