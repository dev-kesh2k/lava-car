import { LogOut, WifiOff } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOnline } from '@/hooks/useOnline';
import { cn } from '@/lib/utils';
import { navFor } from './nav-items';

/** Moldura das telas logadas: topo com a loja, menu lateral no tablet e barra inferior no celular. */
export function AppShell() {
  const { profile, tenant, signOut } = useAuth();
  const online = useOnline();
  const items = profile ? navFor(profile.role) : [];

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{tenant?.name ?? 'Lava Car'}</p>
            {profile?.full_name && <p className="truncate text-xs text-muted-foreground">{profile.full_name}</p>}
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === '/' || i.to === '/admin'}
                className={({ isActive }) =>
                  cn('flex items-center gap-1.5 rounded-md px-3 py-2 text-sm', isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent')
                }
              >
                <i.icon className="h-4 w-4" />
                {i.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
            <LogOut />
          </Button>
        </div>
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-warning px-3 py-1 text-xs text-warning-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Sem internet: as mudanças voltam a sincronizar quando a conexão voltar.
          </div>
        )}
      </header>

      <main className={cn('container flex-1 py-4', items.length > 1 && 'pb-24 md:pb-6')}>
        <Outlet />
      </main>

      {items.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex overflow-x-auto">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === '/' || i.to === '/admin'}
                className={({ isActive }) =>
                  cn('flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                <i.icon className="h-5 w-5" />
                {i.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
