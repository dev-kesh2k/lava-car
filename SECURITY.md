# Segurança

## Como reportar
Encontrou uma falha? Não abra issue pública: escreva pelo e-mail do mantenedor no perfil do GitHub com os passos para reproduzir.

## Modelo de segurança
- **RLS em todas as tabelas.** A anon key é pública por natureza; quem protege os dados são as políticas em `supabase/migrations/*_rls_*.sql`.
- Cliente só lê os próprios carros, OS, vistorias e cartão fidelidade. Equipe só enxerga a própria loja. Fluxo de caixa e relatórios só para ADMIN.
- Preço, duração e vaga são calculados **no banco** (`book_appointment`/`open_walk_in`); o cliente não consegue mandar o valor.
- Papel, comissão e status de usuário só mudam pelo ADMIN da loja (trigger `profiles_guard`).
- Fotos da vistoria ficam em bucket **privado**, acessadas por URL assinada de 1 h.
- Webhook do Mercado Pago confere a assinatura `x-signature` e consulta o pagamento na API antes de marcar como pago.
- Segredos (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `VAPID_PRIVATE_KEY`, service role) só nos secrets das Edge Functions — nunca no repositório nem no `.env` do frontend.
