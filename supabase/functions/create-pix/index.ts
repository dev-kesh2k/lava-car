// Gera o QR Code Pix de uma OS (Mercado Pago). Chamado pelo app logo após o agendamento com "Pix antecipado".
import { corsHeaders, json } from '../_shared/cors.ts';
import { createPixPayment } from '../_shared/mercadopago.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const PIX_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const { os_id } = await req.json();
    if (typeof os_id !== 'string') return json({ error: 'os_id obrigatório' }, 400);

    // Lê a OS com o JWT do cliente: o RLS garante que ele só gera Pix das próprias OS.
    const user = userClient(req);
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return json({ error: 'Não autenticado' }, 401);
    const { data: os, error } = await user.from('appointments_os').select('*').eq('id', os_id).single();
    if (error || !os) return json({ error: 'OS não encontrada' }, 404);
    if (os.payment_status === 'PAID') return json({ error: 'OS já paga' }, 409);
    if (os.status === 'CANCELED') return json({ error: 'OS cancelada' }, 409);

    // Cobrança ainda válida: devolve a mesma.
    if (os.pix_payment_id && os.pix_qr_code && os.pix_expires_at && new Date(os.pix_expires_at) > new Date()) {
      return json({
        payment_id: os.pix_payment_id,
        qr_code: os.pix_qr_code,
        qr_code_base64: os.pix_qr_base64,
        expires_at: os.pix_expires_at,
        amount: Number(os.total_amount),
      });
    }

    const expiresAt = new Date(Date.now() + PIX_MINUTES * 60_000);
    const payment = await createPixPayment({
      amount: Number(os.total_amount),
      description: `Lava Car - OS ${os.number}`,
      externalReference: os.id,
      payerEmail: auth.user.email || `cliente+${auth.user.id}@lavacar.app`,
      expiresAt,
      notificationUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
    });
    const tx = payment.point_of_interaction?.transaction_data ?? {};

    const admin = adminClient();
    await admin
      .from('appointments_os')
      .update({
        payment_method: 'PIX',
        pix_payment_id: String(payment.id),
        pix_qr_code: tx.qr_code ?? null,
        pix_qr_base64: tx.qr_code_base64 ?? null,
        pix_expires_at: expiresAt.toISOString(),
      })
      .eq('id', os.id);

    return json({
      payment_id: String(payment.id),
      qr_code: tx.qr_code,
      qr_code_base64: tx.qr_code_base64,
      expires_at: expiresAt.toISOString(),
      amount: Number(os.total_amount),
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'Não foi possível gerar o Pix' }, 500);
  }
});
