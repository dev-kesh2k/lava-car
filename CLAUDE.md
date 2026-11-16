# Lava Car — especificação e roteiro

Sistema para lava-car (PWA mobile-first): o cliente agenda pelo celular e acompanha o carro ao vivo; o balcão toca o pátio num tablet; o dono controla preços, equipe e caixa. Pensado como SaaS multi-tenant (cada loja é um `tenant_id`). Responder e documentar em **pt-BR**.

## Stack
- **Frontend (PWA / mobile-first):** React + Vite + TypeScript + Tailwind CSS + shadcn/ui (`src/components/ui`). Instalável no celular sem loja de apps (`public/manifest.webmanifest` + `src/sw.ts`).
- **Backend e banco:** Supabase — PostgreSQL + Auth + Storage (fotos da vistoria) + Realtime (pátio e acompanhamento sem F5).
- **Pagamentos:** Mercado Pago (Pix com QR Code automático e confirmação por webhook). Asaas pode entrar no lugar trocando `supabase/functions/_shared/mercadopago.ts`.
