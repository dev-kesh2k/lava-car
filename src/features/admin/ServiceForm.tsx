import { useState } from 'react';
import { saveService, saveServicePrices } from '@/api/services';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import type { Service, ServiceKind, VehicleCategory } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { parseMoney } from '@/lib/format';
import { priceFor, type PriceMatrix } from '@/lib/pricing';
import { CATEGORIES } from '@/lib/vehicle';
import { PriceMatrixInputs, type PriceDraft } from './PriceMatrix';

function draftFrom(matrix: PriceMatrix, id?: string): PriceDraft {
  return Object.fromEntries(
    CATEGORIES.map((c) => {
      const p = id ? priceFor(matrix, id, c) : null;
      return [c, p === null ? '' : String(p).replace('.', ',')];
    }),
  ) as PriceDraft;
}

/** Cadastro do serviço com a linha de preços por porte. */
export function ServiceForm({ tenantId, service, matrix, onSaved }: { tenantId: string; service?: Service; matrix: PriceMatrix; onSaved: () => void }) {
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [kind, setKind] = useState<ServiceKind>(service?.kind ?? 'MAIN');
  const [duration, setDuration] = useState(String(service?.duration_min ?? 30));
  const [active, setActive] = useState(service?.active ?? true);
  const [prices, setPrices] = useState<PriceDraft>(() => draftFrom(matrix, service?.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = Number(duration);
    if (!name.trim()) return setError('Dê um nome ao serviço.');
    if (!Number.isInteger(minutes) || minutes < 5) return setError('Duração mínima de 5 minutos.');
    const parsed: Partial<Record<VehicleCategory, number | null>> = {};
    for (const c of CATEGORIES) {
      const raw = prices[c].trim();
      if (!raw) parsed[c] = null;
      else {
        const v = parseMoney(raw);
        if (Number.isNaN(v)) return setError(`Preço inválido: ${raw}`);
        parsed[c] = v;
      }
    }
    if (Object.values(parsed).every((v) => v === null)) return setError('Informe o preço de pelo menos um porte.');
    setBusy(true);
    setError(null);
    try {
      const saved = await saveService(tenantId, { name: name.trim(), description: description.trim(), kind, duration_min: minutes, active }, service?.id);
      await saveServicePrices(tenantId, saved.id, parsed);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="svc-name">Nome</Label>
          <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lavagem Completa" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="svc-desc">Descrição</Label>
          <Input id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Externa + aspiração + painel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-kind">Tipo</Label>
          <NativeSelect id="svc-kind" value={kind} onChange={(e) => setKind(e.target.value as ServiceKind)}>
            <option value="MAIN">Principal</option>
            <option value="ADDON">Adicional</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-dur">Duração (min)</Label>
          <Input id="svc-dur" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Preço por porte</Label>
        <PriceMatrixInputs value={prices} onChange={setPrices} />
      </div>
      <label className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm">Disponível para agendamento</span>
        <Switch checked={active} onCheckedChange={setActive} label="Ativo" />
      </label>
      {error && <Alert kind="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={busy}>
        Salvar serviço
      </Button>
    </form>
  );
}
