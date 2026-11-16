import { AtSign, ChevronDown, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useConfig } from '../../config';
import { PageHead } from '../../ui';
import { waLink } from '../../util';

export default function Help() {
  const config = useConfig();
  const goal = config?.loyaltyGoal || 10;
  const FAQ = [
    { q: 'Como o preço é calculado?', a: 'Cada serviço tem um preço por porte do carro (Pequeno/Hatch, Médio/Sedan, Grande/SUV e Caminhonete). Ao escolher o carro da sua garagem, o app já mostra os valores dele.' },
    { q: 'Preciso pagar antes?', a: 'Não. Por enquanto o pagamento é feito no local, na retirada (dinheiro, Pix ou cartão). Não cobramos sinal.' },
    { q: 'Como acompanho a lavagem?', a: 'Em Lavagens, abra o agendamento: a barra mostra Agendado, No pátio, Lavando, Finalizando e Pronto para retirada, e a tela atualiza sozinha.' },
    { q: 'Como vejo meus agendamentos?', a: 'Não precisa de cadastro: informe o mesmo celular usado no agendamento. Ele fica salvo neste aparelho para as próximas vezes.' },
    { q: 'Posso cancelar?', a: 'Sim, enquanto o carro não chegou ao pátio: abra o agendamento e toque em "Cancelar". Depois disso, fale com a loja.' },
    { q: 'Como funciona o cartão fidelidade?', a: `Cada lavagem concluída vale 1 selo no seu celular. Completou ${goal} selos, a próxima lavagem (serviço principal) é grátis: avise no balcão.` },
    { q: 'O que é a vistoria?', a: 'Na chegada a equipe fotografa o carro e anota riscos ou amassados que já existiam. As fotos aparecem no seu agendamento.' },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead back="/perfil" title="Ajuda e suporte" />
      <div className="flex flex-col gap-3">
        {FAQ.map((f) => (
          <details key={f.q} className="card group p-0">
            <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-5 text-base font-bold">
              <span className="min-w-0 flex-1">{f.q}</span>
              <ChevronDown size={20} className="shrink-0 text-soft transition group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-soft">{f.a}</p>
          </details>
        ))}
      </div>

      <h2 className="h2 mb-3 mt-8">Fale com a loja</h2>
      <div className="flex flex-col gap-3">
        {config?.whatsapp && (
          <a href={waLink(config.whatsapp)} target="_blank" rel="noreferrer" className="btn-primary">
            <MessageCircle size={20} /> WhatsApp
          </a>
        )}
        {config?.phone && (
          <a href={`tel:${config.phone.replace(/[^\d+]/g, '')}`} className="btn-secondary">
            <Phone size={20} /> {config.phone}
          </a>
        )}
        {config?.instagram && (
          <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noreferrer" className="btn-secondary">
            <AtSign size={20} /> @{config.instagram}
          </a>
        )}
        {config?.address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`} target="_blank" rel="noreferrer" className="card flex items-start gap-3 p-4">
            <MapPin size={20} className="mt-0.5 shrink-0 text-accent" />
            <span className="min-w-0 break-words text-soft">{config.address}</span>
          </a>
        )}
        {config && !config.whatsapp && !config.phone && !config.instagram && !config.address && (
          <p className="text-muted">Os contatos da loja ainda não foram cadastrados. Procure o balcão.</p>
        )}
      </div>
    </div>
  );
}
