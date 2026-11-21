import { useState, type FormEvent } from 'react';
import { Smartphone } from 'lucide-react';
import { isValidPhone, maskPhone } from '../../client';
import { FormError } from '../../ui';

/** Pede o celular usado no agendamento para mostrar os agendamentos do cliente. */
export default function PhoneGate({ onSubmit, text, button }: { onSubmit: (phone: string) => void; text?: string; button?: string }) {
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) return setErr('Informe o celular com DDD, ex.: (45) 99123-4567');
    onSubmit(phone);
  }

  return (
    <form onSubmit={submit} className="card mx-auto flex max-w-md flex-col gap-4 p-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint text-accent">
        <Smartphone size={26} />
      </div>
      <div>
        <p className="text-body font-semibold">Qual é o seu celular?</p>
        <p className="mt-1 text-muted">{text || 'Use o mesmo número informado no agendamento para ver suas lavagens.'}</p>
      </div>
      <input
        className="input"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(45) 99123-4567"
        aria-label="Celular com DDD"
        value={phone}
        onChange={(e) => setPhone(maskPhone(e.target.value))}
      />
      <FormError message={err} />
      <button type="submit" className="btn-primary">{button || 'Ver lavagens'}</button>
    </form>
  );
}
