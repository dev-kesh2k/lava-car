import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { openWalkIn } from '@/api/appointments';
import { findByPlate } from '@/api/vehicles';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalog } from '@/hooks/useCatalog';
import type { VehicleCategory } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { formatBRL } from '@/lib/format';
import { isValidPlate, normalizePlate } from '@/lib/plate';
import { priceFor, quote, servicesForCategory } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { SizePicker } from '../garage/SizePicker';

/** Cliente que chegou sem agendar: placa, porte e serviço, e o carro entra direto na fila. */
export function WalkInDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const catalog = useCatalog();
  const [plate, setPlate] = useState('');
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mainId, setMainId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPlate('');
      setCategory(null);
      setModel('');
      setColor('');
      setName('');
      setPhone('');
      setMainId(null);
      setAddonIds([]);
      setKnown(false);
      setError(null);
    }
  }, [open]);

  // Placa completa: procura o carro (cliente que já veio antes preenche sozinho).
  useEffect(() => {
    if (!isValidPlate(plate)) return setKnown(false);
    let alive = true;
    findByPlate(plate)
      .then((v) => {
        if (!alive || !v) return;
        setKnown(true);
        setCategory(v.category);
        setModel(v.model);
        setColor(v.color);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [plate]);

  const q = category ? quote(catalog.services, catalog.matrix, category, mainId, addonIds) : null;

  async function submit() {
    if (!isValidPlate(plate)) return setError('Placa inválida.');
    if (!category || !mainId) return setError('Escolha o porte e o serviço.');
    setBusy(true);
    setError(null);
    try {
      await openWalkIn({ plate, category, serviceId: mainId, addonIds, model, color, customerName: name, customerPhone: phone });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova OS no balcão</DialogTitle>
          <DialogDescription>Cliente sem agendamento entra direto na fila.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="walkin-plate">Placa</Label>
          <div className="relative">
            <Input
              id="walkin-plate"
              value={plate}
              onChange={(e) => setPlate(normalizePlate(e.target.value))}
              placeholder="ABC1D23"
              autoCapitalize="characters"
              className="h-14 font-mono text-2xl uppercase tracking-widest"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {known && <p className="text-xs text-success">Carro já cadastrado: dados preenchidos.</p>}
        </div>

        <SizePicker value={category} onChange={(c) => { setCategory(c); setMainId(null); setAddonIds([]); }} />

        {category && (
          <div className="space-y-2">
            <Label>Serviço</Label>
            <div className="grid grid-cols-2 gap-2">
              {servicesForCategory(catalog.mains, catalog.matrix, category).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setMainId(s.id)}
                  className={cn('rounded-lg border-2 p-3 text-left', mainId === s.id ? 'border-primary bg-primary/5' : 'border-border')}
                >
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-sm text-primary">{formatBRL(priceFor(catalog.matrix, s.id, category))}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {servicesForCategory(catalog.addons, catalog.matrix, category).map((s) => {
                const on = addonIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAddonIds(on ? addonIds.filter((x) => x !== s.id) : [...addonIds, s.id])}
                    className={cn('rounded-full border px-3 py-1.5 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}
                  >
                    + {s.name} {formatBRL(priceFor(catalog.matrix, s.id, category))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
          <Input placeholder="Cor" value={color} onChange={(e) => setColor(e.target.value)} />
          <Input placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="WhatsApp" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {error && <Alert kind="error">{error}</Alert>}
        <Button size="xl" className="w-full" disabled={busy || !mainId} onClick={submit}>
          Jogar na fila {q && q.items.length > 0 && `· ${formatBRL(q.total)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
