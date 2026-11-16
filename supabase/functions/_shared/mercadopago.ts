// Cliente mínimo da API de Pagamentos do Mercado Pago (Pix).
// Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
const API = 'https://api.mercadopago.com';

export interface MpPayment {
  id: number;
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  external_reference: string | null;
  transaction_amount: number;
  date_of_expiration: string | null;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
}

function token(): string {
  const t = Deno.env.get('MP_ACCESS_TOKEN');
  if (!t) throw new Error('MP_ACCESS_TOKEN não configurado');
  return t;
}

export async function createPixPayment(input: {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  expiresAt: Date;
  notificationUrl: string;
}): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      // Mesma OS = mesma cobrança, mesmo que o cliente toque duas vezes.
      'X-Idempotency-Key': input.externalReference,
    },
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      date_of_expiration: input.expiresAt.toISOString().replace('Z', '-00:00'),
      payer: { email: input.payerEmail },
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPayment(id: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`);
  return res.json();
}

/**
 * Confere a assinatura do webhook (header x-signature: "ts=...,v1=...").
 * Manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com HMAC-SHA256 do MP_WEBHOOK_SECRET.
 */
export async function verifyWebhookSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!secret) return false;
  const header = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const hex = Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, parts.v1);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
