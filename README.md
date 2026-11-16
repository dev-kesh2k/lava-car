# Lava Car

[![Testes](https://github.com/dev-kesh2k/lava-car/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-kesh2k/lava-car/actions/workflows/ci.yml)

Sistema completo para lava-car, instalável no celular (PWA):

- **Cliente:** agenda em menos de 40 segundos, acompanha o carro ao vivo e junta selos no cartão fidelidade.
- **Balcão / pátio:** Kanban em tempo real, OS para cliente avulso, vistoria com fotos e aviso no WhatsApp.
- **Dono:** painel de faturamento, matriz de preços por porte, comissões semanais e fluxo de caixa.

Feito com React + Vite + TypeScript + Tailwind + shadcn/ui no front e Supabase (Postgres, Auth, Storage, Realtime e Edge Functions) no back. Pix pelo Mercado Pago.

## Como rodar

```bash
npm install
cp .env.example .env.local      # preencha a URL e a anon key do Supabase
npx supabase start              # Postgres + Auth + Storage locais (Docker)
npx supabase db reset           # aplica as migrações e o seed da loja demo
npm run dev
```

Abra `http://localhost:5173/entrar?loja=lava-car-demo`. O primeiro usuário entra como cliente; para virar dono:

```sql
update public.profiles set role = 'ADMIN' where email = 'voce@exemplo.com';
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `supabase/migrations` | Schema, RLS, regras de agenda, comissões e relatórios |
| `supabase/functions` | Pix (`create-pix`), webhook do Mercado Pago (`mp-webhook`) e Web Push (`notify-status`) |
| `src/lib` | Regras puras com testes (horários livres, preços, fuso, placa, fidelidade...) |
| `src/api` | Chamadas ao Supabase |
| `src/features` | Telas por área: cliente, pátio e administração |
| `docs/` | Arquitetura, banco, pagamentos, PWA e deploy |

## Testes

```bash
npm test          # Vitest
npm run check     # tipos + lint + testes (o mesmo do CI)
```

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [Banco de dados e RLS](docs/banco-de-dados.md)
- [Agenda e capacidade de boxes](docs/agenda.md)
- [Pagamentos Pix](docs/pagamentos.md)
- [PWA e notificações](docs/pwa.md)
- [Deploy](docs/deploy.md)

## Licença

[MIT](LICENSE)
