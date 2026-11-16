import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Clock } from 'lucide-react';
import { useApi, type Service, type Size } from '../../api';
import { CarSilhouette, ErrorBox, Loading, PageHead, ServiceIcon } from '../../ui';
import { brl, duration, priceFor, SIZE_INFO, SIZES } from '../../util';

const KEY = 'lava-car:porte';
const savedSize = (): Size => {
  const v = localStorage.getItem(KEY) as Size | null;
  return v && SIZES.includes(v) ? v : 'small';
};

/** Catálogo de serviços para o cliente: preço de cada lavagem e adicional conforme o porte do carro. */
export default function Catalog() {
  const services = useApi<{ services: Service[] }>('/services');
  const [size, setSize] = useState<Size>(savedSize);
  const choose = (s: Size) => {
    setSize(s);
    localStorage.setItem(KEY, s);
  };

  const list = (services.data?.services ?? []).filter((s) => s.active !== false);
  const groups = [
    { title: 'Lavagens', items: list.filter((s) => s.kind === 'main') },
    { title: 'Adicionais', items: list.filter((s) => s.kind === 'addon') },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHead title="Serviços" subtitle="Escolha o porte do carro para ver o preço de cada serviço." />

      <div className="segmented mb-2 grid-cols-4" role="tablist" aria-label="Porte do carro">
        {SIZES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={size === s}
            onClick={() => choose(s)}
            className={`segment min-h-[60px] flex-col gap-1 leading-tight ${size === s ? 'segment-on' : ''}`}
          >
            <CarSilhouette size={s} className={`h-4 w-8 ${size === s ? 'text-accent' : 'text-muted'}`} />
            <span className="text-footnote">{SIZE_INFO[s].short}</span>
          </button>
        ))}
      </div>
      <p className="mb-6 px-1 text-footnote text-muted">
        {SIZE_INFO[size].label}: {SIZE_INFO[size].example}
      </p>

      {services.loading && !services.data && <Loading />}
      {services.error && <ErrorBox message={services.error} onRetry={services.reload} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title}>
            <p className="group-title">{g.title}</p>
            <div className="list" style={{ '--sep-inset': '68px' } as CSSProperties}>
              {g.items.map((s) => {
                const price = priceFor(s, size);
                return (
                  <div key={s.id} className={`cell items-start py-3.5 ${price === null ? 'opacity-50' : ''}`}>
                    <ServiceIcon icon={s.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold">{s.name}</p>
                      {s.description && <p className="mt-0.5 text-subhead text-muted">{s.description}</p>}
                      <p className="mt-1 flex items-center gap-1 text-footnote text-muted">
                        <Clock size={13} aria-hidden /> {duration(s.durationMin)}
                      </p>
                    </div>
                    <p className="shrink-0 whitespace-nowrap pt-0.5 text-right text-headline font-semibold tabular-nums">
                      {price === null ? <span className="text-footnote font-normal text-muted">Indisponível</span> : brl(price)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {groups.length > 0 && (
        <Link to="/agendar" className="btn-primary mt-8 w-full">
          <CalendarPlus size={20} aria-hidden /> Agendar lavagem
        </Link>
      )}
    </>
  );
}
