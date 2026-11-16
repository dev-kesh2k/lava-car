# Pagamentos (Pix)

## Fluxo
1. Cliente escolhe **Pix antecipado** no passo 4; `book_appointment` cria a OS com `payment_method = PIX`.
2. O app chama a Edge Function `create-pix`, que cria o pagamento no Mercado Pago (`X-Idempotency-Key` = id da OS) e guarda QR Code e validade (30 min) na OS.
3. O cliente paga no app do banco. O Mercado Pago chama `mp-webhook`.
4. O webhook confere a assinatura, consulta o pagamento na API e, se aprovado e com o mesmo valor, muda a OS para `PAID`.
5. Triggers lançam a entrada no caixa; o Realtime avisa a tela do Pix ("Pagamento confirmado!") e o pátio.

Pagamento no balcão: o operador toca no selo "A pagar" do cartão da OS e confirma.

## Configuração
```bash
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-...      # credencial de produção do Mercado Pago
npx supabase secrets set MP_WEBHOOK_SECRET=...            # "Assinatura secreta" das notificações
npx supabase functions deploy create-pix mp-webhook
```
No painel do Mercado Pago, cadastre o webhook `https://<projeto>.supabase.co/functions/v1/mp-webhook` (evento Pagamentos). Depois ligue "Aceitar Pix antecipado" em **Loja**.
