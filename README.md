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
