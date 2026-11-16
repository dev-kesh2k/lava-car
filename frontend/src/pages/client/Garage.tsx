import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CarFront, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, useApi, type Vehicle } from '../../api';
import { useSavedPhone } from '../../client';
import PhoneGate from './PhoneGate';
import { ActionSheet, Empty, ErrorBox, Loading, PageHead, toast } from '../../ui';
import { formatPlate } from '../../util';
import { VehicleRow, VehicleSheet } from './parts';

/** Garagem: os carros do celular salvo no aparelho. */
export default function Garage() {
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<{ vehicles: Vehicle[] }>(phone ? `/vehicles?phone=${encodeURIComponent(phone)}` : null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Vehicle | null>(null);

  if (!phone)
    return (
      <div>
        <PageHead title="Garagem" />
        <PhoneGate onSubmit={setPhone} text="Seus carros ficam ligados ao seu celular, sem cadastro." button="Abrir garagem" />
      </div>
    );

  async function remove(v: Vehicle) {
    if (!confirm(`Tirar ${v.model || formatPlate(v.plate)} da garagem?`)) return;
    try {
      await api.del(`/vehicles/${v.id}?phone=${encodeURIComponent(phone)}`);
      toast('Carro removido');
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <div>
      <PageHead
        title="Garagem"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3">
            Celular {phone}
            <button className="min-h-[44px] font-semibold text-accent" onClick={() => setPhone('')}>
              Trocar número
            </button>
          </span>
        }
        action={
          <button
            className="btn-pill"
            aria-label="Adicionar carro"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={20} /> Carro
          </button>
        }
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.vehicles.length === 0 && (
        <Empty
          icon={CarFront}
          title="Garagem vazia"
          text="Cadastre a placa, o modelo e o porte. O preço da lavagem depende do tamanho do carro."
          action={
            <button className="btn-primary w-full" onClick={() => setOpen(true)}>
              <Plus size={20} /> Adicionar carro
            </button>
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.vehicles.map((v) => (
          <VehicleRow
            key={v.id}
            v={v}
            right={
              <button
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent active:bg-surface2"
                aria-label={`Opções de ${formatPlate(v.plate)}`}
                onClick={() => setMenu(v)}
              >
                <MoreHorizontal size={22} />
              </button>
            }
          />
        ))}
      </div>
      {data && data.vehicles.length > 0 && (
        <Link to="/agendar" className="btn-primary mt-6 w-full sm:w-auto sm:min-w-[16rem]">
          <CalendarPlus size={20} /> Agendar lavagem
        </Link>
      )}
      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? `${menu.model || 'Carro'} · ${formatPlate(menu.plate)}` : undefined}
        actions={
          menu
            ? [
                { label: 'Editar carro', icon: Pencil, onClick: () => (setEditing(menu), setOpen(true)) },
                { label: 'Tirar da garagem', icon: Trash2, destructive: true, onClick: () => remove(menu) },
              ]
            : []
        }
      />
      <VehicleSheet open={open} onClose={() => setOpen(false)} phone={phone} vehicle={editing} onSaved={() => reload()} />
    </div>
  );
}
