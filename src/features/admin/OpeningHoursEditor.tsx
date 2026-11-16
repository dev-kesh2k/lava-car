import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { OpeningHours } from '@/lib/database.types';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Horário de funcionamento por dia da semana (fechado = null). */
export function OpeningHoursEditor({ value, onChange }: { value: OpeningHours; onChange: (v: OpeningHours) => void }) {
  return (
    <div className="divide-y rounded-lg border">
      {DAYS.map((label, i) => {
        const key = String(i);
        const h = value[key] ?? null;
        return (
          <div key={key} className="flex items-center gap-3 p-3">
            <Switch checked={!!h} onCheckedChange={(on) => onChange({ ...value, [key]: on ? { open: '08:00', close: '18:00' } : null })} label={`Abre ${label}`} />
            <span className="w-20 text-sm font-medium">{label}</span>
            {h ? (
              <div className="flex items-center gap-2">
                <Input type="time" className="w-28" value={h.open} onChange={(e) => onChange({ ...value, [key]: { ...h, open: e.target.value } })} aria-label={`Abre ${label}`} />
                <span className="text-muted-foreground">às</span>
                <Input type="time" className="w-28" value={h.close} onChange={(e) => onChange({ ...value, [key]: { ...h, close: e.target.value } })} aria-label={`Fecha ${label}`} />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Fechado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
