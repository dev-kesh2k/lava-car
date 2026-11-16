import type { VehicleCategory } from '@/lib/database.types';
import { CATEGORIES, CATEGORY_INFO } from '@/lib/vehicle';
import { cn } from '@/lib/utils';

/** Silhuetas simples de cada porte (largura cresce com o tamanho do carro). */
function CarIcon({ category, className }: { category: VehicleCategory; className?: string }) {
  const body: Record<VehicleCategory, string> = {
    HATCH: 'M6 22h36l-3-7c-1-2-3-3-5-3H17c-2 0-4 1-5 3l-4 4H6z',
    SEDAN: 'M3 22h42l-2-5-6-2-5-4H17c-2 0-3 1-4 2l-4 4-5 1z',
    SUV: 'M3 22h42v-6l-5-2-4-5H12c-2 0-3 1-4 3l-3 4H3z',
    PICKUP: 'M2 22h44v-7H30V10H14c-2 0-3 1-4 3l-3 3H2z',
  };
  return (
    <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
      <path d={body[category]} fill="currentColor" opacity="0.85" />
      <circle cx="13" cy="23" r="4" fill="currentColor" />
      <circle cx="36" cy="23" r="4" fill="currentColor" />
    </svg>
  );
}

/** Seletor visual de porte: Pequeno, Médio, Grande/SUV e Caminhonete. */
export function SizePicker({ value, onChange }: { value: VehicleCategory | null; onChange: (c: VehicleCategory) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Porte do veículo">
      {CATEGORIES.map((c) => {
        const info = CATEGORY_INFO[c];
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition',
              selected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            <CarIcon category={c} className="h-8 w-14" />
            <span className="text-sm font-semibold text-foreground">{info.size}</span>
            <span className="text-xs">{info.label}</span>
            <span className="text-[11px] leading-tight opacity-80">{info.example}</span>
          </button>
        );
      })}
    </div>
  );
}
