# Como contribuir

1. Crie uma branch a partir da `main` (todo push na `main` vai para o ar).
2. Mudança no banco = **nova** migração Prisma em `backend/prisma/migrations` (nunca edite uma já aplicada).
3. Regra de negócio nova vai em `backend/src/rules.js` com teste em `backend/test/rules.test.js`.
4. Antes do PR: `cd backend && npm test && npm run build` e `cd frontend && npx tsc -b && npx vite build --base /lava-car/` (o CI roda o mesmo).
5. Textos da interface e da documentação em português do Brasil.

## Convenções
- Telas do cliente em `frontend/src/pages/client`, da equipe em `frontend/src/pages/admin`; chamadas à API em `frontend/src/api.ts`.
- Preço, duração, vaga, comissão e caixa são calculados no backend; o frontend só mostra.
- Nada de senha ou token no repositório: `backend/.env.example` leva os nomes com valor vazio.
