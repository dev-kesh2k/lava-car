import { Car, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Vehicle } from '@/lib/database.types';
import { formatPlate } from '@/lib/plate';
import { cn } from '@/lib/utils';
import { CATEGORY_INFO, vehicleTitle } from '@/lib/vehicle';

/** Passo 1: qual carro (o porte dele filtra os preços do passo 2). */
export function StepVehicle({ vehicles, value, onChange }: { vehicles: Vehicle[]; value: string | null; onChange: (id: string) => void }) {
  if (!vehicles.length) {
    return (
      <EmptyState icon={Car} title="Cadastre seu carro para agendar">
        <Button asChild>
          <Link to="/garagem">
            <Plus /> Ir para a garagem
          </Link>
        </Button>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Veículo">
      {vehicles.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={value === v.id}
          onClick={() => onChange(v.id)}
          className={cn('flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition', value === v.id ? 'border-primary bg-primary/5' : 'border-border')}
        >
          <Car className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">{vehicleTitle(v)}</p>
            <p className="font-mono text-sm text-muted-foreground">{formatPlate(v.plate)}</p>
          </div>
          <Badge variant="secondary">{CATEGORY_INFO[v.category].size}</Badge>
          {value === v.id && <Check className="h-5 w-5 text-primary" />}
        </button>
      ))}
    </div>
  );
}
