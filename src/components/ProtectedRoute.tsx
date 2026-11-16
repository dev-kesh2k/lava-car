import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { canAccess, homeFor, type Area } from '@/lib/roles';

/** Barra quem não está logado (vai para /entrar) e quem não tem o papel da área (vai para a tela dele). */
export function ProtectedRoute({ area }: { area: Area }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!profile) {
    return (
      <div className="container py-10 text-center text-muted-foreground">
        Seu cadastro ainda não está ligado a nenhuma loja. Fale com o lava-car.
      </div>
    );
  }
  if (!profile.active) return <div className="container py-10 text-center text-muted-foreground">Seu acesso foi desativado pela loja.</div>;
  if (!canAccess(profile.role, area)) return <Navigate to={homeFor(profile.role)} replace />;
  return <Outlet />;
}
