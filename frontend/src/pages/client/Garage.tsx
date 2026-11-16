import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CarFront, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, useApi, type Vehicle } from '../../api';
import { useSavedPhone } from '../../client';
import PhoneGate from './PhoneGate';
import { Empty, ErrorBox, Loading, PageHead, toast } from '../../ui';
import { formatPlate } from '../../util';
import { VehicleRow, VehicleSheet } from './parts';

/** Garagem: os carros do celular salvo no aparelho. */
export default function Garage() {
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<{ vehicles: Vehicle[] }>(phone ? `/vehicles?phone=${encodeURIComponent(phone)}` : null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);

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
            <button className="min-h-[44px] font-bold text-accent" onClick={() => setPhone('')}>
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
            <Plus size={20} /> <span className="hidden min-[380px]:inline">Carro</span>
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
              <div className="flex shrink-0 gap-1">
                <button
                  className="icon-btn h-11 w-11"
                  aria-label={`Editar ${formatPlate(v.plate)}`}
                  onClick={() => {
                    setEditing(v);
                    setOpen(true);
                  }}
                >
                  <Pencil size={18} />
                </button>
                <button className="icon-btn h-11 w-11 text-danger" aria-label={`Remover ${formatPlate(v.plate)}`} onClick={() => remove(v)}>
                  <Trash2 size={18} />
                </button>
              </div>
            }
          />
        ))}
      </div>
      {data && data.vehicles.length > 0 && (
        <Link to="/agendar" className="btn-primary mt-6 w-full sm:w-auto sm:min-w-[16rem]">
          <CalendarPlus size={20} /> Agendar lavagem
        </Link>
      )}
      <VehicleSheet open={open} onClose={() => setOpen(false)} phone={phone} vehicle={editing} onSaved={() => reload()} />
    </div>
  );
}
