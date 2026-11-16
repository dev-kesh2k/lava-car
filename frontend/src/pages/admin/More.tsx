import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Bell, ChevronRight, LogOut, MessageSquareHeart, Settings, Tag, User, Users } from 'lucide-react';
import { useAuth } from '../../auth';
import { PageHead, Tile } from '../../ui';

const ITEMS = [
  { to: '/admin/servicos', label: 'Serviços e preços', hint: 'Matriz de preço por porte', icon: Tag, color: '#0A6CD6' },
  { to: '/admin/equipe', label: 'Equipe e boxes', hint: 'Acessos, comissão e boxes de lavagem', icon: Users, color: '#5856D6' },
  { to: '/admin/comissoes', label: 'Comissões', hint: 'Fechamento semanal', icon: BadgePercent, color: '#34C759' },
  { to: '/admin/feedback', label: 'Feedback', hint: 'Avaliações e mensagens dos clientes', icon: MessageSquareHeart, color: '#FF2D55' },
  { to: '/admin/notificacoes', label: 'Notificações', hint: 'Agendamentos e cancelamentos', icon: Bell, color: '#FF3B30' },
  { to: '/admin/config', label: 'Configurações', hint: 'Loja, horário, fidelidade e WhatsApp', icon: Settings, color: '#8E8E93' },
  { to: '/admin/conta', label: 'Minha conta', hint: 'Nome, e-mail e senha', icon: User, color: '#FF9500' },
];

export default function More() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Mais" />
      <nav className="list" style={{ '--sep-inset': '58px' } as CSSProperties} aria-label="Mais opções">
        {ITEMS.map((m) => (
          <Link key={m.to} to={m.to} className="cell py-2.5">
            <Tile icon={m.icon} color={m.color} />
            <span className="min-w-0 flex-1">
              <span className="block text-body">{m.label}</span>
              <span className="block truncate text-footnote text-muted">{m.hint}</span>
            </span>
            <ChevronRight size={20} className="chev" />
          </Link>
        ))}
      </nav>
      <button onClick={signOut} className="list cell mt-7 justify-center text-body text-danger active:bg-surface2">
        <LogOut size={20} /> Sair
      </button>
    </div>
  );
}
