import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { useApi, type Loyalty } from '../../api';
import { useSavedPhone } from '../../client';
import PhoneGate from './PhoneGate';
import { ErrorBox, Loading, PageHead } from '../../ui';
import { LoyaltyCard } from './parts';

/** Cartão fidelidade em selos do celular salvo. */
export default function LoyaltyPage() {
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<{ loyalty: Loyalty }>(phone ? `/loyalty?phone=${encodeURIComponent(phone)}` : null);

  if (!phone)
    return (
      <div>
        <PageHead title="Fidelidade" />
        <PhoneGate onSubmit={setPhone} text="Seu cartão fidelidade fica ligado ao seu celular." button="Ver meu cartão" />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Fidelidade" subtitle={`Celular ${phone}`} />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <LoyaltyCard loyalty={data.loyalty} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="card p-5">
              <p className="text-sm text-muted">Lavagens no total</p>
              <p className="font-display text-4xl font-extrabold">{data.loyalty.totalWashes}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted">Grátis disponíveis</p>
              <p className="font-display text-4xl font-extrabold text-ok">{data.loyalty.rewards}</p>
            </div>
          </div>
          {data.loyalty.rewards > 0 && <p className="mt-4 rounded-2xl bg-okbg p-4 text-sm text-soft">Para usar a lavagem grátis, avise no balcão quando chegar: a equipe aplica na sua OS.</p>}
          <Link to="/agendar" className="btn-primary mt-6 w-full sm:w-auto sm:min-w-[16rem]">
            <CalendarPlus size={20} /> Agendar lavagem
          </Link>
        </>
      )}
    </div>
  );
}
