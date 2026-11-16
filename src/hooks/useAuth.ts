import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro do AuthProvider');
  return ctx;
}

/** Atalho para telas que só abrem logadas: perfil e loja garantidos pelo ProtectedRoute. */
export function useSession() {
  const { profile, tenant, ...rest } = useAuth();
  if (!profile || !tenant) throw new Error('Tela protegida aberta sem perfil');
  return { profile, tenant, ...rest };
}
