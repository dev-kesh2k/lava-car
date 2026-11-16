import type { Damage } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { DAMAGE_AREAS, DAMAGE_TYPES, toggleDamage } from './damages';

/** Marcação rápida de avarias pré-existentes por área do carro. */
export function DamageMarker({ value, onChange }: { value: Damage[]; onChange: (d: Damage[]) => void }) {
  return (
    <div className="space-y-2">
      {DAMAGE_AREAS.map(({ area, label }) => (
        <div key={area} className="flex flex-wrap items-center gap-1.5">
          <span className="w-28 text-sm font-medium">{label}</span>
          {DAMAGE_TYPES.map(({ type, label: tl }) => {
            const on = value.some((d) => d.area === area && d.type === type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(toggleDamage(value, area, type))}
                className={cn('rounded-full border px-2.5 py-1 text-xs', on ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border text-muted-foreground')}
              >
                {tl}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
