# Changelog

## 0.2.0 — 2026-11-16
### Mudou
- App refeito sobre o template de agendamento do Hub: `frontend/` (React + Vite + Tailwind) e `backend/` (Express + Prisma) no PostgreSQL do servidor, publicado em `/lava-car/`.
- Boxes no lugar de profissionais: horário livre só com box sobrando durante toda a lavagem; box atribuído pelo sistema.
- Cliente identificado pelo celular; equipe com login (dono e operador).

### Mantido
- Garagem com porte, preços por porte, wizard em 4 passos, acompanhamento ao vivo, fidelidade em selos, pátio em Kanban, OS avulsa, vistoria com fotos, WhatsApp de carro pronto, painel, comissões e caixa.

### Depois
- Pix antecipado (código preparado e desligado).

### Removido
- Versão Supabase (migrações SQL, Edge Functions e frontend na raiz).

## 0.1.0 — 2026-11-16
### Fase 1 — Fundação
- Schema multi-tenant com RLS: lojas, perfis, veículos, serviços com preço por porte, OS, vistoria, fidelidade, caixa e push.
- Regras no banco: agendamento com checagem de boxes, OS avulsa, fluxo de status, selos de fidelidade e entrada automática no caixa.

### Fase 2 — Cliente
- Login por WhatsApp (OTP), e-mail ou Google; garagem virtual; wizard de agendamento em 4 passos; acompanhamento ao vivo; cartão fidelidade.

### Fase 3 — Pátio
- Kanban em tempo real, OS avulsa, vistoria com até 4 fotos e avarias, aviso no WhatsApp.

### Fase 4 — Dono
- Painel gerencial, matriz de preços, comissões semanais e fluxo de caixa.

### Fase 5 — Automações e PWA
- Pix com confirmação por webhook, Web Push de carro pronto, manifest e service worker.
