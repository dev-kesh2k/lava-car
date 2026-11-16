import { Navigate } from 'react-router-dom';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { homeFor } from '@/lib/roles';

/** Volta do link mágico / Google: o supabase-js lê o token da URL e o AuthContext carrega o perfil. */
export function AuthCallback() {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <PageSpinner />;
  return <Navigate to={session ? homeFor(profile?.role) : '/entrar'} replace />;
}
