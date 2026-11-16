import { useState } from 'react';
import { updateTenant } from '@/api/tenants';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/hooks/useAuth';
import type { OpeningHours } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { OpeningHoursEditor } from './OpeningHoursEditor';
import { validateOpeningHours } from './hours';

/** Dados da loja, capacidade de boxes, agenda, fidelidade e Pix. */
export function SettingsPage() {
  const { tenant, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone ?? '');
  const [address, setAddress] = useState(tenant.address ?? '');
  const [capacity, setCapacity] = useState(String(tenant.box_capacity));
  const [interval, setInterval] = useState(String(tenant.slot_interval_min));
  const [goal, setGoal] = useState(String(tenant.loyalty_goal));
  const [pix, setPix] = useState(tenant.pix_enabled);
  const [hours, setHours] = useState<OpeningHours>(tenant.opening_hours);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const hoursError = validateOpeningHours(hours);
    if (hoursError) return setError(hoursError);
    const cap = Number(capacity);
    const g = Number(goal);
    if (!Number.isInteger(cap) || cap < 1 || cap > 50) return setError('Boxes simultâneos: de 1 a 50.');
    if (!Number.isInteger(g) || g < 2 || g > 50) return setError('Meta da fidelidade: de 2 a 50 lavagens.');
    setBusy(true);
    setError(null);
    try {
      await updateTenant(tenant.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        box_capacity: cap,
        slot_interval_min: Number(interval),
        loyalty_goal: g,
        pix_enabled: pix,
        opening_hours: hours,
      });
      await refresh();
      toast('Configurações salvas');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const inviteLink = `${window.location.origin}/entrar?loja=${tenant.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Minha loja" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Nome</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-phone">WhatsApp da loja</Label>
              <Input id="t-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-addr">Endereço</Label>
              <Input id="t-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            Link de cadastro dos clientes: <code className="break-all">{inviteLink}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-cap">Boxes simultâneos</Label>
              <Input id="t-cap" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-int">Intervalo da agenda</Label>
              <NativeSelect id="t-int" value={interval} onChange={(e) => setInterval(e.target.value)}>
                {[10, 15, 20, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <OpeningHoursEditor value={hours} onChange={setHours} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fidelidade e pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t-goal">Lavagens para ganhar uma grátis</Label>
            <Input id="t-goal" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))} />
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">
              Aceitar Pix antecipado
              <span className="block text-xs text-muted-foreground">Exige o token do Mercado Pago nos secrets das Edge Functions.</span>
            </span>
            <Switch checked={pix} onCheckedChange={setPix} label="Pix antecipado" />
          </label>
        </CardContent>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      <Button size="lg" className="w-full" disabled={busy} onClick={save}>
        Salvar
      </Button>
    </div>
  );
}
