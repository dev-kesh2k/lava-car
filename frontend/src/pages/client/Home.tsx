import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronRight, MapPin, MessageSquareHeart, Star } from 'lucide-react';
import { useConfig } from '../../config';
import Social, { socialLinks } from './Social';
import { useApi, type Loyalty, type Order, type Service } from '../../api';
import { getSavedName, getSavedPhone } from '../../client';
import { ErrorBox, Loading, Plate, ServiceIcon } from '../../ui';
import { brl, duration, firstName, fmtShort, isOpen, minPrice, STATUS } from '../../util';
import { LoyaltyCard, Tracker } from './parts';

export default function Home() {
  const phone = getSavedPhone();
  const name = getSavedName();
  const services = useApi<{ services: Service[] }>('/services');
  const config = useConfig();
  const q = phone ? `?phone=${encodeURIComponent(phone)}` : '';
  const mine = useApi<{ orders: Order[]; today: string }>(phone ? `/orders/by-phone${q}` : null);
  const loyalty = useApi<{ loyalty: Loyalty }>(phone ? `/loyalty${q}` : null);

  const open = (mine.data?.orders || []).filter((o) => isOpen(o.status) && (o.status !== 'scheduled' || o.date >= mine.data!.today));
  // No pátio vem primeiro; depois o próximo agendamento.
  const current = open.find((o) => o.status !== 'scheduled') || open.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  return (
    <div>
      <header className="mb-6 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base text-muted">{name ? `Olá, ${firstName(name)}` : 'Olá!'}</p>
          <h1 className="h1 mt-1">Carro limpo, sem fila</h1>
        </div>
        <Link to="/agenda" className="icon-btn" aria-label="Minhas lavagens">
          <CalendarDays size={22} />
        </Link>
      </header>

      {current ? (
        <Link to={`/agenda/${current.id}`} className="card block p-5 transition active:scale-[0.99]">
          <div className="mb-4 flex items-center gap-3">
            <Plate plate={current.plate} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{current.model || 'Seu carro'}</p>
              <p className={`text-sm font-bold ${STATUS[current.status].text}`}>
                {current.status === 'scheduled' ? `Agendado · ${fmtShort(current.date, current.time)}` : STATUS[current.status].label}
              </p>
            </div>
            <ChevronRight className="shrink-0 text-soft" />
          </div>
          <Tracker order={current} />
        </Link>
      ) : (
        <div className="stripes overflow-hidden rounded-[20px] border border-line p-6">
          <p className="font-display text-[clamp(1.8rem,8vw,2.4rem)] font-extrabold uppercase leading-[0.95]">
            Agende em <span className="text-accent">menos de 1 minuto</span>
          </p>
          <p className="mt-2 text-base text-soft">Escolha o carro, a lavagem e o horário. Acompanhe ao vivo e retire quando ficar pronto.</p>
        </div>
      )}
      <Link to="/agendar" className="btn-primary mt-4 w-full sm:w-auto sm:min-w-[16rem]">
        <CalendarPlus size={20} /> Agendar lavagem
      </Link>

      {loyalty.data && (
        <Link to="/fidelidade" className="mt-6 block">
          <LoyaltyCard loyalty={loyalty.data.loyalty} compact />
        </Link>
      )}

      <section className="mt-8">
        <h2 className="h2 mb-4">Serviços</h2>
        {services.loading && !services.data && <Loading />}
        {services.error && <ErrorBox message={services.error} onRetry={services.reload} />}
        <div className="grid gap-3 lg:grid-cols-2">
          {services.data?.services.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 p-4">
              <ServiceIcon icon={s.icon} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {s.name} {s.kind === 'addon' && <span className="ml-1 rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium text-soft">adicional</span>}
                </p>
                <p className="text-sm text-muted">{s.description || duration(s.durationMin)}</p>
              </div>
              <p className="shrink-0 text-right text-sm text-muted">
                a partir de
                <span className="block text-base font-bold text-accent">{brl(minPrice(s))}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <Link to="/perfil/feedback" className="card mt-8 flex items-center gap-4 p-5 transition active:scale-[0.99]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint2 text-accent">
          <MessageSquareHeart size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">Deixe seu feedback</span>
          <span className="block text-base text-muted">Elogio, sugestão ou reclamação: conte pra gente.</span>
        </span>
        <ChevronRight size={22} className="shrink-0 text-muted" />
      </Link>

      {config?.googleReviewUrl && (
        <a href={config.googleReviewUrl} target="_blank" rel="noreferrer" className="card mt-3 flex items-center gap-4 p-5 transition active:scale-[0.99]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint2 text-accent">
            <Star size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">Avalie no Google</span>
            <span className="block text-base text-muted">Gostou da lavagem? Deixe sua avaliação.</span>
          </span>
          <ChevronRight size={22} className="shrink-0 text-muted" />
        </a>
      )}

      {config && (
        <section className="card mt-8 p-6 text-center">
          <p className="font-display text-3xl font-bold uppercase leading-none text-accent">{config.studioName}</p>
          {config.address && (
            <p className="mx-auto mt-3 flex max-w-xs items-start justify-center gap-1.5 text-sm text-muted">
              <MapPin size={16} className="mt-0.5 shrink-0" /> <span className="break-words">{config.address}</span>
            </p>
          )}
          <Link to="/sobre" className="btn-secondary mt-5 w-full">
            Sobre e localização
          </Link>
          {socialLinks(config).length > 0 && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm text-muted">Siga a gente</p>
              <div className="flex justify-center">
                <Social config={config} compact />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
