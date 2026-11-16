import { Car, Plus } from 'lucide-react';
import { useState } from 'react';
import { createVehicle, deleteVehicle, listMyVehicles, updateVehicle } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import type { Vehicle } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { VehicleCard } from './VehicleCard';
import { VehicleForm } from './VehicleForm';

/** Garagem virtual: os carros do cliente (o porte define o preço no agendamento). */
export function GaragePage() {
  const { profile, tenant } = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => listMyVehicles(profile.id), [profile.id]);
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);

  async function remove(v: Vehicle) {
    if (!confirm(`Apagar ${v.model || v.plate} da garagem?`)) return;
    try {
      await deleteVehicle(v.id);
      toast('Carro removido');
      await reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Minha garagem"
        description="Cadastre seus carros uma vez e agende em poucos toques."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> Carro
          </Button>
        }
      />
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data && data.length ? (
        <div className="space-y-2">
          {data.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onEdit={() => setEditing(v)} onDelete={() => remove(v)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Car} title="Nenhum carro cadastrado">
          <Button onClick={() => setEditing('new')}>Cadastrar meu carro</Button>
        </EmptyState>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Novo carro' : 'Editar carro'}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <VehicleForm
              initial={editing === 'new' ? undefined : editing}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                if (editing === 'new') await createVehicle(tenant.id, profile.id, input);
                else await updateVehicle(editing.id, input);
                toast(editing === 'new' ? 'Carro cadastrado' : 'Carro atualizado');
                setEditing(null);
                await reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
