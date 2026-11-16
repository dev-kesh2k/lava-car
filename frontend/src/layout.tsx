import type { ComponentType, ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BadgePercent,
  CalendarDays,
  Car,
  ClipboardList,
  Home,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings,
  Stamp,
  Tag,
  User,
  Users,
  Wallet,
  Warehouse,
  type LucideProps,
} from 'lucide-react';
import { API_BASE } from './api';
import { useAuth } from './auth';
import { useConfig } from './config';
import { toast } from './ui';
import { waLink } from './util';

type Icon = ComponentType<LucideProps>;
/** support: em vez de abrir uma página, leva ao WhatsApp da loja (Configurações → WhatsApp da loja). */
export type Tab = { to: string; label: string; icon: Icon; end?: boolean; support?: boolean };

/** Ícone do WhatsApp na cor do texto (o lucide não tem ícones de marca). */
export function WhatsAppIcon({ size = 24, className }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.77 6.68c0 5.2-4.24 9.43-9.46 9.43zm8.04-17.47A11.3 11.3 0 0 0 12.04.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.6l6-1.57a11.33 11.33 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z" />
    </svg>
  );
}

// Celular: 5 abas (Fidelidade fica no Início e no Perfil). Desktop: menu lateral com tudo.
export const CLIENT_TABS: Tab[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/agenda', label: 'Lavagens', icon: CalendarDays },
  { to: '/garagem', label: 'Garagem', icon: Car },
  { to: '/suporte', label: 'Suporte', icon: WhatsAppIcon, support: true },
  { to: '/perfil', label: 'Perfil', icon: User },
];
export const CLIENT_SIDE: Tab[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/agenda', label: 'Lavagens', icon: CalendarDays },
  { to: '/garagem', label: 'Garagem', icon: Car },
  { to: '/fidelidade', label: 'Fidelidade', icon: Stamp },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/suporte', label: 'Suporte', icon: WhatsAppIcon, support: true },
];

// Dono (admin): barra inferior com o essencial; o resto fica em "Mais" (e no menu lateral do desktop).
export const ADMIN_TABS: Tab[] = [
  { to: '/admin', label: 'Pátio', icon: Warehouse, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/painel', label: 'Painel', icon: LayoutGrid },
  { to: '/admin/caixa', label: 'Caixa', icon: Wallet },
  { to: '/admin/mais', label: 'Mais', icon: Menu },
];
export const ADMIN_SIDE: Tab[] = [
  { to: '/admin', label: 'Pátio', icon: Warehouse, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/painel', label: 'Painel do dono', icon: LayoutGrid },
  { to: '/admin/caixa', label: 'Fluxo de caixa', icon: Wallet },
  { to: '/admin/comissoes', label: 'Comissões', icon: BadgePercent },
  { to: '/admin/servicos', label: 'Serviços e preços', icon: Tag },
  { to: '/admin/equipe', label: 'Equipe e boxes', icon: Users },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
];
// Operador: só o pátio, a agenda e a própria conta (sem financeiro).
export const OPERATOR_TABS: Tab[] = [
  { to: '/admin', label: 'Pátio', icon: Warehouse, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/conta', label: 'Conta', icon: ClipboardList },
];

export function Logo({ compact }: { compact?: boolean }) {
  const config = useConfig();
  const size = compact ? 'h-10 w-10' : 'h-12 w-12';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={config?.logoVersion ? `${API_BASE}/logo?v=${config.logoVersion}` : `${import.meta.env.BASE_URL}icons/icon.svg`}
        alt=""
        className={`${size} shrink-0 rounded-xl object-contain`}
      />
      <p className="min-w-0 truncate font-display text-2xl font-extrabold uppercase leading-none">{config?.studioName || 'Lava Car'}</p>
    </div>
  );
}

/** Item do menu: link de página ou, na aba de suporte, link direto para o WhatsApp da loja. */
function TabLink({ tab, className, children }: { tab: Tab; className: (active: boolean) => string; children: ReactNode }) {
  const config = useConfig();
  if (tab.support) {
    const number = config?.whatsapp || config?.phone || '';
    if (!number)
      return (
        <button type="button" className={className(false)} onClick={() => toast('A loja ainda não cadastrou o WhatsApp de suporte.', true)}>
          {children}
        </button>
      );
    return (
      <a className={className(false)} href={waLink(number, `Olá! Preciso de suporte${config?.studioName ? ` — ${config.studioName}` : ''}.`)} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <NavLink to={tab.to} end={tab.end} className={({ isActive }) => className(isActive)}>
      {children}
    </NavLink>
  );
}

/** Página com abas: barra inferior no celular e menu lateral a partir do md. */
export function TabsLayout({ tabs, side, admin }: { tabs: Tab[]; side?: Tab[]; admin?: boolean }) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-[100dvh] md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-tabbar px-4 py-6 md:flex">
        <div className="px-2">
          <Logo compact />
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu">
          {(side || tabs).map((t) => (
            <TabLink
              key={t.to}
              tab={t}
              className={(isActive) =>
                `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium transition ${
                  isActive ? 'bg-tint2 font-bold text-accent' : 'text-soft hover:bg-surface'
                }`
              }
            >
              <t.icon size={22} /> {t.label}
            </TabLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {admin ? (
            <>
              {side && (
              <NavLink
                to="/admin/config"
                className={({ isActive }) =>
                  `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium ${isActive ? 'bg-tint2 text-accent' : 'text-soft hover:bg-surface'}`
                }
              >
                <Settings size={22} /> Configurações
              </NavLink>
              )}
              <button onClick={signOut} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium text-accent hover:bg-surface">
                <LogOut size={22} /> Sair
              </button>
            </>
          ) : (
            <NavLink to="/admin" className="flex min-h-[44px] items-center gap-3 rounded-2xl px-4 text-sm text-muted hover:bg-surface">
              <Lock size={18} /> Área da equipe
            </NavLink>
          )}
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(2.25rem,env(safe-area-inset-top))] md:px-10 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      <nav
        aria-label="Menu"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-tabbar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex max-w-xl">
          {tabs.map((t) => (
            <TabLink
              key={t.to}
              tab={t}
              className={(isActive) =>
                `flex min-h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[clamp(11px,3.4vw,13px)] transition ${
                  isActive ? 'font-bold text-accent' : 'text-muted'
                }`
              }
            >
              <t.icon size={24} strokeWidth={1.9} />
              <span className="max-w-full truncate">{t.label}</span>
            </TabLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Tela cheia sem abas (fluxo de agendamento). */
export function FullPage({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <div className={`mx-auto w-full max-w-3xl px-6 pt-[max(2.25rem,env(safe-area-inset-top))] ${footer ? 'pb-[calc(7.5rem+env(safe-area-inset-bottom))]' : 'pb-[max(2rem,env(safe-area-inset-bottom))]'}`}>
        {children}
      </div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>
        </div>
      )}
    </div>
  );
}
