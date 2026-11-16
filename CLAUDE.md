# Lava Car — especificação e roteiro

Sistema para lava-car (PWA mobile-first): o cliente agenda pelo celular e acompanha o carro ao vivo; o balcão toca o pátio num tablet; o dono controla preços, equipe e caixa. Pensado como SaaS multi-tenant (cada loja é um `tenant_id`). Responder e documentar em **pt-BR**.

## Stack
- **Frontend (PWA / mobile-first):** React + Vite + TypeScript + Tailwind CSS + shadcn/ui (`src/components/ui`). Instalável no celular sem loja de apps (`public/manifest.webmanifest` + `src/sw.ts`).
- **Backend e banco:** Supabase — PostgreSQL + Auth + Storage (fotos da vistoria) + Realtime (pátio e acompanhamento sem F5).
- **Pagamentos:** Mercado Pago (Pix com QR Code automático e confirmação por webhook). Asaas pode entrar no lugar trocando `supabase/functions/_shared/mercadopago.ts`.

## Fase 1 — Fundação, banco e regras de negócio
Modelar o banco inteiro antes da interface (`supabase/migrations`).
- Multi-tenant: toda tabela tem `tenant_id`.
- Tabelas: `tenants` (dados, horários, boxes simultâneos), `profiles` (ADMIN / OPERATOR / CUSTOMER), `vehicles` (placa, modelo, cor, categoria Hatch/Sedan/SUV/Caminhonete), `services` + `service_prices` (preço por categoria), `appointments_os` (+ `os_items`), `os_checklist` (fotos e avarias), `loyalty_cards`, `cash_entries`, `push_subscriptions`.
- RLS: cliente só vê os próprios carros/OS; equipe só vê a própria loja; financeiro só o dono.

## Fase 2 — Fluxo do cliente (atrito zero: agendar em menos de 40 s)
- Login por telefone/WhatsApp (OTP) ou e-mail/Google.
- Garagem virtual com seletor visual de porte (Pequeno, Médio, Grande/SUV, Caminhonete).
- Wizard: 1) veículo (filtra preços pelo porte) 2) serviço principal + adicionais 3) data/hora — **disponibilidade = duração do serviço × boxes livres** 4) resumo e pagamento (no local ou Pix antecipado).
- Tracker ao vivo: Agendado ➔ No pátio ➔ Lavando ➔ Finalizando ➔ Pronto para retirada.
- Cartão fidelidade digital em selos.

## Fase 3 — Painel operacional (pátio e balcão)
- Kanban do pátio (Aguardando | Em lavagem | Acabamento | Pronto) com arrastar e botões grandes de avanço.
- OS avulsa (walk-in): placa, porte, serviço e direto para a fila.
- Vistoria de entrada: até 4 fotos pela câmera + marcação de avarias.
- Botão do WhatsApp no carro "Pronto": "Olá [Nome], seu [Modelo] placa [Placa] já está limpo e pronto para retirada!"

## Fase 4 — Administrativo e financeiro (dono)
- Dashboard: faturamento do dia/mês, carros lavados, ticket médio, serviços mais vendidos.
- Matriz de preços (serviço × porte).
- Comissões por funcionário (% sobre o valor) e fechamento semanal.
- Fluxo de caixa: entradas automáticas das OS pagas + despesas manuais.

## Fase 5 — Automações, pagamentos e PWA
- Pix automático: webhook muda a OS para PAGO.
- Web Push quando o carro fica Pronto.
- PWA: manifest, service worker, tela cheia e carregamento rápido.

## Roteiro de execução (prompts)
| Ordem | Prompt |
|---|---|
| 1º | "Atue como um Arquiteto de Software Sênior. Com base nas especificações da Fase 1, gere o schema SQL completo para PostgreSQL/Supabase, incluindo chaves estrangeiras, índices, triggers de atualização de timestamp e políticas de RLS para isolamento Multi-Tenant." |
| 2º | "Inicialize a estrutura de pastas de um projeto React + TypeScript + Vite + Tailwind + Shadcn/UI. Configure o cliente do Supabase, os tipos TypeScript gerados a partir do banco de dados e o sistema de autenticação com controle de rotas por perfil (Admin, Operador, Cliente)." |
| 3º | "Desenvolva a Fase 2 (Módulo do Cliente), começando pelo cadastro de veículos e pelo algoritmo de verificação de horários disponíveis (evitando conflito de agendamentos baseado na capacidade de boxes simultâneos da loja)." |
| 4º | "Desenvolva a Fase 3 (Painel Operacional). Crie o quadro Kanban do pátio usando Supabase Realtime para que mudanças de status reflitam instantaneamente na tela do cliente, além do formulário de vistoria com upload de fotos para o Supabase Storage." |
| 5º | "Desenvolva a Fase 4 (Financeiro e Comissões) e configure o manifest.json e service worker para transformar a aplicação em um PWA instalável." |
