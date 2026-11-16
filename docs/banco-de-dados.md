# Banco de dados

Migrações em `supabase/migrations`, aplicadas em ordem pelo nome.

## Tabelas
| Tabela | Para quê |
|---|---|
| `tenants` | A loja: horários por dia da semana (`opening_hours`), boxes simultâneos, intervalo da agenda, meta da fidelidade, Pix ligado |
| `profiles` | Usuário do Auth ligado à loja com papel e % de comissão |
| `vehicles` | Placa normalizada (ABC1D23), modelo, cor e categoria (HATCH, SEDAN, SUV, PICKUP) |
| `services` / `service_prices` | Catálogo e matriz de preços por categoria |
| `appointments_os` | Agendamento que vira OS: status da fila, valores, pagamento, Pix, horários de cada etapa |
| `os_items` | Serviços da OS com nome/preço/duração congelados |
| `os_checklist` | Vistoria: até 4 fotos e lista de avarias |
| `loyalty_cards` | Selos, prêmios disponíveis e usados |
| `cash_entries` | Fluxo de caixa (entradas de OS pagas e despesas) |
| `push_subscriptions` | Inscrições de Web Push por aparelho |

## Regras automáticas (triggers)
- `set_updated_at` em todas as tabelas com `updated_at`.
- `os_set_ends_at`: `ends_at = scheduled_at + duração`.
- `os_status_flow`: grava `started_at`/`finished_at`/`delivered_at`, atribui o funcionário que começou a lavar e trava OS cancelada.
- `os_loyalty_stamp`: primeira vez em Pronto/Entregue carimba um selo; ao bater a meta vira prêmio.
- `os_set_paid_at` + `os_payment_cash`: OS paga entra no caixa (uma vez só); estorno remove.
- `handle_new_user`: cadastro cria perfil CUSTOMER e cartão fidelidade na loja do link (`tenant_slug`).
- `profiles_guard`: só o ADMIN muda papel, comissão e status.

## Funções chamadas pelo app
| Função | Quem | O que faz |
|---|---|---|
| `get_busy_intervals(from, to)` | logado | Horários ocupados da loja (sem dados pessoais) |
| `book_appointment(...)` | cliente | Valida carro, serviços, preço, horário de funcionamento e boxes; cria OS e itens |
| `open_walk_in(...)` | equipe | Cria/atualiza o carro pela placa e joga na fila |
| `cancel_appointment(os)` | cliente/equipe | Cancela enquanto está Agendado |
| `redeem_loyalty_reward(cliente)` | equipe | Usa uma lavagem grátis |
| `dashboard_summary(de, até)` | ADMIN | Faturamento, carros, ticket médio, top 5 e série diária |
| `commission_report(de, até)` | ADMIN | Comissão por funcionário |
