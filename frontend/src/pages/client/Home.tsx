import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronRight, Clock, MapPin, MessageSquareHeart, Star } from 'lucide-react';
import { useConfig } from '../../config';
import Social, { socialLinks } from './Social';
import { useApi, type Loyalty, type Order, type Service } from '../../api';
import { getSavedName, getSavedPhone } from '../../client';
import { ErrorBox, Loading, PageHead, Plate, ServiceIcon } from '../../ui';
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
      <PageHead
        eyebrow={name ? `Olá, ${firstName(name)}` : 'Olá!'}
        title="Carro limpo, sem fila"
        barTitle={config?.studioName || 'Início'}
        toolbar={
          <Link to="/agenda" className="bar-btn" aria-label="Minhas lavagens">
            <CalendarDays size={23} strokeWidth={1.75} />
          </Link>
        }
      />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div>
          {current ? (
            <Link to={`/agenda/${current.id}`} className="card block p-4 transition-opacity duration-200 active:opacity-80 min-[380px]:p-5">
              <div className="mb-5 flex items-center gap-3">
                <Plate plate={current.plate} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">{current.model || 'Seu carro'}</p>
                  <p className={`truncate text-subhead font-semibold ${STATUS[current.status].text}`}>
                    {current.status === 'scheduled' ? `Agendado · ${fmtShort(current.date, current.time)}` : STATUS[current.status].label}
                  </p>
                </div>
                <ChevronRight size={20} className="chev" />
              </div>
              <Tracker order={current} />
            </Link>
          ) : (
            <div className="card relative overflow-hidden p-5">
              <span className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-tint" aria-hidden />
              <span className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-brand text-onaccent">
                <Clock size={22} strokeWidth={2} />
              </span>
              <p className="relative text-title2 font-bold">Agende em menos de 1 minuto</p>
              <p className="relative mt-1 text-subhead text-muted">Escolha o carro, a lavagem e o horário. Acompanhe ao vivo e retire quando ficar pronto.</p>
            </div>
          )}
          <Link to="/agendar" className="btn-primary mt-4 w-full">
            <CalendarPlus size={20} strokeWidth={2} /> Agendar lavagem
          </Link>
        </div>
        {loyalty.data && (
          <Link to="/fidelidade" className="mt-7 block lg:mt-0 transition-transform duration-200 active:scale-[0.99]" aria-label="Abrir cartão fidelidade">
            <LoyaltyCard loyalty={loyalty.data.loyalty} compact />
          </Link>
        )}
      </div>

      <section className="mt-8">
        <h2 className="h2 mb-3 px-1">Serviços</h2>
        {services.loading && !services.data && <Loading />}
        {services.error && <ErrorBox message={services.error} onRetry={services.reload} />}
        {services.data && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[services.data.services.filter((s) => s.kind === 'main'), services.data.services.filter((s) => s.kind === 'addon')]
              .filter((g) => g.length)
              .map((group, gi) => (
                <div key={gi}>
                  <p className="group-title">{gi === 0 ? 'Lavagens' : 'Adicionais'}</p>
                  <div className="list" style={{ '--sep-inset': '68px' } as CSSProperties}>
                    {group.map((s) => (
                      <div key={s.id} className="cell">
                        <ServiceIcon icon={s.icon} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-medium">{s.name}</p>
                          <p className="text-footnote text-muted">{s.description || duration(s.durationMin)}</p>
                        </div>
                        <p className="shrink-0 text-right text-caption text-muted">
                          a partir de
                          <span className="block text-body font-semibold text-ink">{brl(minPrice(s))}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <div className="list mt-8" style={{ '--sep-inset': '60px' } as CSSProperties}>
        <Link to="/perfil/feedback" className="cell">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FF2D55] text-white">
            <MessageSquareHeart size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body">Deixe seu feedback</span>
            <span className="block text-footnote text-muted">Elogio, sugestão ou reclamação: conte pra gente.</span>
          </span>
          <ChevronRight size={20} className="chev" />
        </Link>
        {config?.googleReviewUrl && (
          <a href={config.googleReviewUrl} target="_blank" rel="noreferrer" className="cell">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FF9F0A] text-white">
              <Star size={18} strokeWidth={2} fill="currentColor" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body">Avalie no Google</span>
              <span className="block text-footnote text-muted">Gostou da lavagem? Deixe sua avaliação.</span>
            </span>
            <ChevronRight size={20} className="chev" />
          </a>
        )}
      </div>

      {config && (
        <section className="mt-8">
          <div className="list">
            <div className="cell flex-col items-start gap-1 py-4">
              <p className="text-title3 font-bold">{config.studioName}</p>
              {config.address && (
                <p className="flex items-start gap-1.5 text-subhead text-muted">
                  <MapPin size={16} className="mt-0.5 shrink-0" /> <span className="break-words">{config.address}</span>
                </p>
              )}
            </div>
            <Link to="/sobre" className="cell text-accent">
              <span className="min-w-0 flex-1 text-body">Sobre e localização</span>
              <ChevronRight size={20} className="chev" />
            </Link>
            {socialLinks(config).length > 0 && (
              <div className="cell justify-between py-2.5">
                <span className="text-subhead text-muted">Siga a gente</span>
                <Social config={config} compact />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
