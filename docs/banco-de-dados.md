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
