import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cancelAppointment, getOs, listMyAppointments } from '@/api/appointments';
import { getMyLoyaltyCard } from '@/api/loyalty';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import { useRealtimeOS } from '@/hooks/useRealtimeOS';
import { errorMessage } from '@/lib/errors';
import { isActive } from '@/lib/status';
import { LiveTracker } from '../tracker/LiveTracker';
import { LoyaltyStamps } from '../loyalty/LoyaltyStamps';
import { AppointmentList } from './AppointmentList';
import { InstallBanner } from './InstallBanner';
import { PushOptIn } from './PushOptIn';

/** Tela inicial do cliente: carro em andamento ao vivo, atalho para agendar e cartão fidelidade. */
export function CustomerHome() {
  const { profile, tenant } = useSession();
  const toast = useToast();
  const appts = useAsync(() => listMyAppointments(profile.id), [profile.id]);
  const card = useAsync(() => getMyLoyaltyCard(profile.id), [profile.id]);

  // Mudança de status no pátio chega aqui sem F5.
  useRealtimeOS(`customer_id=eq.${profile.id}`, async (row, event) => {
    if (event === 'DELETE') return;
    const fresh = await getOs(row.id).catch(() => null);
    if (!fresh) return;
    appts.setData((list) => {
      const others = (list ?? []).filter((o) => o.id !== fresh.id);
      return [fresh, ...others].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    });
    if (row.status === 'READY' || row.status === 'DELIVERED') void card.reload();
  });

  const list = appts.data ?? [];
  const active = list.filter((o) => isActive(o.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const inYard = active.filter((o) => o.status !== 'SCHEDULED');
  const history = list.filter((o) => !inYard.includes(o)).slice(0, 10);

  async function cancel(id: string) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await cancelAppointment(id);
      toast('Agendamento cancelado');
      await appts.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Olá, {profile.full_name.split(' ')[0] || 'tudo bem'}?</h1>
      </div>

      <InstallBanner />
      <PushOptIn />
      {appts.error && <Alert kind="error">{appts.error}</Alert>}

      {appts.loading ? (
        <Skeleton className="h-48" />
      ) : (
        inYard.map((os) => <LiveTracker key={os.id} os={os} timeZone={tenant.timezone} address={tenant.address} />)
      )}

      <Button asChild size="xl" className="w-full shadow-lg">
        <Link to="/agendar">
          <CalendarPlus /> Agendar lavagem
        </Link>
      </Button>

      {!card.loading && <LoyaltyStamps card={card.data} goal={tenant.loyalty_goal} shopName={tenant.name} />}

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Agendamentos</h2>
          <AppointmentList items={history} timeZone={tenant.timezone} onCancel={(os) => cancel(os.id)} />
        </section>
      )}
    </div>
  );
}
