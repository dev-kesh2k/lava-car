import { Bell } from 'lucide-react';
import { useState } from 'react';
import { enablePushNotifications } from '@/api/push';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/hooks/useAuth';
import { env } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { pushSupported } from '@/lib/push';

/** Convite para ativar o aviso "seu carro está pronto" (some depois de respondido). */
export function PushOptIn() {
  const { profile, tenant } = useSession();
  const toast = useToast();
  const [hidden, setHidden] = useState(() => !pushSupported() || !env.vapidPublicKey || Notification.permission !== 'default');

  if (hidden) return null;

  async function enable() {
    try {
      const ok = await enablePushNotifications(profile.id, tenant.id);
      toast(ok ? 'Pronto! Avisaremos quando o carro estiver limpo.' : 'Notificações bloqueadas no navegador.', ok ? 'success' : 'error');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
    setHidden(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-secondary p-3 text-secondary-foreground">
      <Bell className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm">Quer um aviso no celular quando o carro ficar pronto?</p>
      <Button size="sm" onClick={enable}>
        Ativar
      </Button>
    </div>
  );
}
