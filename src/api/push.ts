import { env } from '@/lib/env';
import { subscribePush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

/** Inscreve o aparelho para receber "seu carro está pronto" e salva no banco. */
export async function enablePushNotifications(profileId: string, tenantId: string): Promise<boolean> {
  const sub = await subscribePush(env.vapidPublicKey);
  if (!sub) return false;
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      tenant_id: tenantId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
  return true;
}

/** Pede para a Edge Function avisar o cliente (chamado pelo pátio quando a OS fica Pronta). */
export async function notifyStatus(osId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-status', { body: { os_id: osId } });
  if (error) console.warn('Push não enviado:', error.message);
}
