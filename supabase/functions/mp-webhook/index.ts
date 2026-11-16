// Webhook do Mercado Pago: confirma o Pix e marca a OS como PAGA (o trigger lança no caixa e o Realtime avisa o app).
import { getPayment, verifyWebhookSignature } from '../_shared/mercadopago.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const dataId = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (type !== 'payment' || !dataId) return new Response('ignorado');

  if (!(await verifyWebhookSignature(req, dataId))) {
    console.warn('Assinatura inválida no webhook', dataId);
    return new Response('assinatura inválida', { status: 401 });
  }

  try {
    // Nunca confia no corpo do webhook: consulta o pagamento direto na API.
    const payment = await getPayment(dataId);
    const osId = payment.external_reference;
    if (!osId) return new Response('sem referência');

    const status = payment.status === 'approved' ? 'PAID' : payment.status === 'refunded' || payment.status === 'charged_back' ? 'REFUNDED' : null;
    if (!status) return new Response('pendente');

    const admin = adminClient();
    const { data: os } = await admin.from('appointments_os').select('id, total_amount, payment_status').eq('id', osId).single();
    if (!os) return new Response('OS não encontrada', { status: 404 });
    if (status === 'PAID' && Math.abs(Number(os.total_amount) - payment.transaction_amount) > 0.009) {
      console.error('Valor pago diferente do valor da OS', osId, payment.transaction_amount, os.total_amount);
      return new Response('valor divergente', { status: 409 });
    }
    if (os.payment_status !== status) {
      await admin.from('appointments_os').update({ payment_status: status, pix_payment_id: String(payment.id) }).eq('id', osId);
    }
    return new Response('ok');
  } catch (err) {
    console.error(err);
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    return new Response('erro', { status: 500 });
  }
});
