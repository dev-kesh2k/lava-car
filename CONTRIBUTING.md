# Como contribuir

1. Crie uma branch a partir da `main`.
2. Mudança no banco = **nova** migração em `supabase/migrations` (nunca edite uma já aplicada).
3. Regra de negócio nova vai em `src/lib` com teste ao lado (`*.test.ts`).
4. Rode `npm run check` antes de abrir o PR (tipos, lint e testes — o CI roda o mesmo).
5. Textos da interface e da documentação em português do Brasil.
