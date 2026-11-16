import type { VehicleCategory } from '@/lib/database.types';
import { CATEGORIES, CATEGORY_INFO } from '@/lib/vehicle';
import { Input } from '@/components/ui/input';

export type PriceDraft = Record<VehicleCategory, string>;

/** Linha da matriz de preços: um valor por porte (vazio = serviço não oferecido para aquele porte). */
export function PriceMatrixInputs({ value, onChange }: { value: PriceDraft; onChange: (v: PriceDraft) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CATEGORIES.map((c) => (
        <label key={c} className="space-y-1">
          <span className="text-xs text-muted-foreground">{CATEGORY_INFO[c].label}</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <Input inputMode="decimal" className="pl-8" value={value[c]} onChange={(e) => onChange({ ...value, [c]: e.target.value })} placeholder="—" />
          </div>
        </label>
      ))}
    </div>
  );
}
