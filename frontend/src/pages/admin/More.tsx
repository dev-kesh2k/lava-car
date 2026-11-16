import { Link } from 'react-router-dom';
import { BadgePercent, Bell, ChevronRight, LogOut, MessageSquareHeart, Settings, Tag, User, Users } from 'lucide-react';
import { useAuth } from '../../auth';
import { PageHead } from '../../ui';

const ITEMS = [
  { to: '/admin/servicos', label: 'Serviços e preços', hint: 'Matriz de preço por porte', icon: Tag },
  { to: '/admin/equipe', label: 'Equipe e boxes', hint: 'Acessos, comissão e boxes de lavagem', icon: Users },
  { to: '/admin/comissoes', label: 'Comissões', hint: 'Fechamento semanal', icon: BadgePercent },
  { to: '/admin/feedback', label: 'Feedback', hint: 'Avaliações e mensagens dos clientes', icon: MessageSquareHeart },
  { to: '/admin/notificacoes', label: 'Notificações', hint: 'Agendamentos e cancelamentos', icon: Bell },
  { to: '/admin/config', label: 'Configurações', hint: 'Loja, horário, fidelidade e WhatsApp', icon: Settings },
  { to: '/admin/conta', label: 'Minha conta', hint: 'Nome, e-mail e senha', icon: User },
];

export default function More() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Mais" />
      <nav className="card py-2" aria-label="Mais opções">
        {ITEMS.map((m) => (
          <Link key={m.to} to={m.to} className="flex min-h-[64px] items-center gap-4 px-5 py-2 transition active:bg-surface2">
            <m.icon size={24} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{m.label}</span>
              <span className="block truncate text-sm text-muted">{m.hint}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-soft" />
          </Link>
        ))}
      </nav>
      <button onClick={signOut} className="card mt-5 flex min-h-[60px] w-full items-center gap-4 px-5 text-left text-lg text-danger">
        <LogOut size={22} /> Sair
      </button>
    </div>
  );
}
