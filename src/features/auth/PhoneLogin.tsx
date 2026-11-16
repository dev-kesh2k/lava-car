import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { formatPhoneBR, toE164 } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

/** Login por telefone: o código chega pelo WhatsApp (ou SMS, se o WhatsApp não estiver configurado). */
export function PhoneLogin({ tenantSlug }: { tenantSlug: string }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(channel: 'whatsapp' | 'sms') {
    const e164 = toE164(phone);
    if (!e164) return setError('Digite o celular com DDD.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { channel, data: { tenant_slug: tenantSlug, full_name: name.trim(), phone: e164.slice(1) } },
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setSentTo(e164);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token: code.trim(), type: 'sms' });
    setBusy(false);
    if (error) setError(errorMessage(error));
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} className="space-y-3">
        <p className="text-sm text-muted-foreground">Mandamos um código de 6 dígitos para {formatPhoneBR(sentTo)}.</p>
        <div className="space-y-1.5">
          <Label htmlFor="otp">Código</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
          Entrar
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-primary" onClick={() => setSentTo(null)}>
            Trocar número
          </button>
          <button type="button" className="text-primary" disabled={busy} onClick={() => send('sms')}>
            Receber por SMS
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send('whatsapp');
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="phone">Celular (WhatsApp)</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(45) 99999-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Seu nome (primeiro acesso)</Label>
        <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        <MessageCircle /> Receber código no WhatsApp
      </Button>
    </form>
  );
}
