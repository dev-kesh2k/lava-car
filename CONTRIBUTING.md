# Como contribuir

1. Crie uma branch a partir da `main`.
2. Mudança no banco = **nova** migração em `supabase/migrations` (nunca edite uma já aplicada).
3. Regra de negócio nova vai em `src/lib` com teste ao lado (`*.test.ts`).
4. Rode `npm run check` antes de abrir o PR (tipos, lint e testes — o CI roda o mesmo).
5. Textos da interface e da documentação em português do Brasil.

## Convenções
- Componentes base do shadcn/ui em `src/components/ui`; telas em `src/features/<área>`.
- Erros para o usuário passam por `errorMessage()` de `src/lib/errors.ts`.
- Valores em dinheiro: `formatBRL` / `parseMoney` (`src/lib/format.ts`).
- Datas: o banco guarda UTC; horários da loja usam `src/lib/timezone.ts` com o fuso do tenant.
