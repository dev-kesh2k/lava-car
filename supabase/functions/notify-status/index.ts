// Web Push "seu carro está pronto": chamado pelo pátio quando a OS vai para Pronto.
import webpush from 'npm:web-push@3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@lavacar.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const MESSAGES: Record<string, string> = {
  WASHING: 'Seu carro começou a ser lavado.',
  READY: 'Seu carro está limpo e pronto para retirada!',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { os_id } = await req.json();
    // Só funcionário da loja dispara: a leitura com o JWT dele passa pelo RLS (os_staff_all).
    const user = userClient(req);
    const { data: os } = await user.from('appointments_os').select('id, status, customer_id, number, vehicle:vehicles(model, plate)').eq('id', os_id).single();
    if (!os) return json({ error: 'OS não encontrada' }, 404);
    const { data: isStaff } = await user.rpc('is_staff');
    if (!isStaff) return json({ error: 'Sem permissão' }, 403);
    if (!os.customer_id || !MESSAGES[os.status]) return json({ sent: 0 });

    const admin = adminClient();
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('profile_id', os.customer_id);
    const vehicle = (os.vehicle ?? {}) as { model?: string; plate?: string };
    const payload = JSON.stringify({
      title: vehicle.model ? `${vehicle.model} ${vehicle.plate ?? ''}`.trim() : 'Lava Car',
      body: MESSAGES[os.status],
      url: '/',
      tag: `os-${os.number}`,
    });

    let sent = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (err) {
        // 404/410 = inscrição expirada (app desinstalado, permissão revogada): apaga.
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('Falha no push', code);
      }
    }
    return json({ sent });
  } catch (err) {
    console.error(err);
    return json({ error: 'Falha ao enviar' }, 500);
  }
});
