import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Vehicle } from '@/lib/database.types';
import { formatPlate } from '@/lib/plate';
import { CATEGORY_INFO, vehicleTitle } from '@/lib/vehicle';

export function VehicleCard({ vehicle, onEdit, onDelete }: { vehicle: Vehicle; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex-1">
        <p className="font-semibold">{vehicleTitle(vehicle)}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded border-2 border-foreground/80 bg-background px-1.5 font-mono text-sm font-bold tracking-wider">{formatPlate(vehicle.plate)}</span>
          <Badge variant="secondary">{CATEGORY_INFO[vehicle.category].size}</Badge>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Apagar">
        <Trash2 />
      </Button>
    </Card>
  );
}
