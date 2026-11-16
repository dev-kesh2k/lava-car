import type { AppRole } from './database.types';

export type Area = 'customer' | 'yard' | 'admin';

/** Quem entra em cada área: o dono vê tudo, o operador o pátio, o cliente só a área dele. */
const ACCESS: Record<Area, AppRole[]> = {
  customer: ['CUSTOMER', 'ADMIN', 'OPERATOR'],
  yard: ['ADMIN', 'OPERATOR'],
  admin: ['ADMIN'],
};

export function canAccess(role: AppRole | null | undefined, area: Area): boolean {
  return !!role && ACCESS[area].includes(role);
}

/** Tela inicial de cada papel depois do login. */
export function homeFor(role: AppRole | null | undefined): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'OPERATOR') return '/patio';
  return '/';
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  CUSTOMER: 'Cliente',
};
