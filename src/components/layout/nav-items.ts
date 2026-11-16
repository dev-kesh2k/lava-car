import { BarChart3, CalendarPlus, Car, ClipboardList, Gift, Home, Settings, Users, Wallet, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/database.types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const CUSTOMER: NavItem[] = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/agendar', label: 'Agendar', icon: CalendarPlus },
  { to: '/garagem', label: 'Garagem', icon: Car },
  { to: '/fidelidade', label: 'Fidelidade', icon: Gift },
];

const OPERATOR: NavItem[] = [{ to: '/patio', label: 'Pátio', icon: ClipboardList }];

const ADMIN: NavItem[] = [
  { to: '/admin', label: 'Painel', icon: BarChart3 },
  { to: '/patio', label: 'Pátio', icon: ClipboardList },
  { to: '/admin/servicos', label: 'Serviços', icon: Wrench },
  { to: '/admin/equipe', label: 'Equipe', icon: Users },
  { to: '/admin/caixa', label: 'Caixa', icon: Wallet },
  { to: '/admin/loja', label: 'Loja', icon: Settings },
];

export function navFor(role: AppRole): NavItem[] {
  if (role === 'ADMIN') return ADMIN;
  if (role === 'OPERATOR') return OPERATOR;
  return CUSTOMER;
}
