import { useState } from 'react';
import type { VehicleInput } from '@/api/vehicles';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Vehicle, VehicleCategory } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { isValidPlate, normalizePlate } from '@/lib/plate';
import { SizePicker } from './SizePicker';

/** Cadastro/edição de veículo: placa, modelo, cor e porte. */
export function VehicleForm({ initial, onSubmit, onCancel }: { initial?: Vehicle; onSubmit: (v: VehicleInput) => Promise<void>; onCancel?: () => void }) {
  const [plate, setPlate] = useState(initial?.plate ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [category, setCategory] = useState<VehicleCategory | null>(initial?.category ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPlate(plate)) return setError('Placa inválida. Use o formato ABC1D23 ou ABC-1234.');
    if (!category) return setError('Escolha o porte do veículo.');
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ plate: normalizePlate(plate), model: model.trim(), color: color.trim(), category });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="plate">Placa</Label>
          <Input
            id="plate"
            value={plate}
            onChange={(e) => setPlate(normalizePlate(e.target.value))}
            placeholder="ABC1D23"
            autoCapitalize="characters"
            className="font-mono text-lg uppercase tracking-widest"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Onix" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Cor</Label>
          <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Prata" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Porte</Label>
        <SizePicker value={category} onChange={setCategory} />
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={busy}>
          {initial ? 'Salvar' : 'Cadastrar carro'}
        </Button>
      </div>
    </form>
  );
}
