import { Check, Clock } from 'lucide-react';
import type { Service, VehicleCategory } from '@/lib/database.types';
import { formatBRL, formatDuration } from '@/lib/format';
import { priceFor, servicesForCategory, type PriceMatrix } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface Props {
  mains: Service[];
  addons: Service[];
  matrix: PriceMatrix;
  category: VehicleCategory;
  mainId: string | null;
  addonIds: string[];
  onMain: (id: string) => void;
  onToggleAddon: (id: string) => void;
}

/** Passo 2: serviço principal + adicionais, já com o preço do porte do carro. */
export function StepServices({ mains, addons, matrix, category, mainId, addonIds, onMain, onToggleAddon }: Props) {
  const availableMains = servicesForCategory(mains, matrix, category);
  const availableAddons = servicesForCategory(addons, matrix, category);

  return (
    <div className="space-y-5">
      <section className="space-y-2" role="radiogroup" aria-label="Serviço principal">
        <h3 className="text-sm font-semibold text-muted-foreground">Serviço principal</h3>
        {availableMains.map((s) => {
          const selected = mainId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onMain(s.id)}
              className={cn('flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition', selected ? 'border-primary bg-primary/5' : 'border-border')}
            >
              <div className="flex-1">
                <p className="font-semibold">{s.name}</p>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatDuration(s.duration_min)}
                </p>
              </div>
              <span className="font-bold text-primary">{formatBRL(priceFor(matrix, s.id, category))}</span>
            </button>
          );
        })}
        {!availableMains.length && <p className="text-sm text-muted-foreground">A loja ainda não cadastrou serviços para este porte.</p>}
      </section>

      {availableAddons.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Adicionais</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableAddons.map((s) => {
              const on = addonIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleAddon(s.id)}
                  className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition', on ? 'border-primary bg-primary/5' : 'border-border')}
                >
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <span className="text-sm text-muted-foreground">+{formatBRL(priceFor(matrix, s.id, category))}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
