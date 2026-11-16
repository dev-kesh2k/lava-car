import { Droplets } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { homeFor } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { EmailLogin } from './EmailLogin';
import { PhoneLogin } from './PhoneLogin';
import { currentTenantSlug } from './tenant-slug';

/** Entrada única: telefone (OTP no WhatsApp) ou e-mail/Google. Primeiro acesso já cria a conta. */
export function LoginPage() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [tenantSlug] = useState(() => currentTenantSlug());

  if (loading) return <PageSpinner />;
  if (session && profile) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/entrar' ? from : homeFor(profile.role)} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-background p-4">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Droplets className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Lava Car</h1>
        <p className="text-sm text-muted-foreground">Agende sua lavagem em segundos e acompanhe ao vivo.</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <div className="mt-2 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm" role="tablist">
            {(
              [
                ['phone', 'Celular'],
                ['email', 'E-mail / Google'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn('rounded-md py-2 font-medium transition', tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>{tab === 'phone' ? <PhoneLogin tenantSlug={tenantSlug} /> : <EmailLogin tenantSlug={tenantSlug} />}</CardContent>
      </Card>
    </div>
  );
}
