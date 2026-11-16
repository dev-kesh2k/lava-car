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
