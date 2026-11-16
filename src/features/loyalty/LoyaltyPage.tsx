import { getMyLoyaltyCard } from '@/api/loyalty';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import { LoyaltyStamps } from './LoyaltyStamps';

export function LoyaltyPage() {
  const { profile, tenant } = useSession();
  const { data, loading, error } = useAsync(() => getMyLoyaltyCard(profile.id), [profile.id]);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Fidelidade" description={`A cada ${tenant.loyalty_goal} lavagens, a próxima é por nossa conta.`} />
      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Skeleton className="h-64 rounded-2xl" /> : <LoyaltyStamps card={data} goal={tenant.loyalty_goal} shopName={tenant.name} />}
      {data && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-2xl font-bold">{data.total_washes}</p>
            <p className="text-xs text-muted-foreground">lavagens no total</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-2xl font-bold">{data.rewards_redeemed}</p>
            <p className="text-xs text-muted-foreground">lavagens grátis usadas</p>
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Para usar a lavagem grátis, é só avisar no balcão.</p>
    </div>
  );
}
