# Deploy

## Supabase
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                       # aplica as migrações
npx supabase functions deploy create-pix mp-webhook notify-status
```
- **Auth → Providers:** Phone (Twilio/MessageBird com canal WhatsApp), Email (link mágico) e Google.
- **Auth → URL Configuration:** Site URL do app e `https://<app>/auth/callback` nas Redirect URLs.
- Crie a primeira loja em `tenants` (ou use o `seed.sql`) e promova o dono para `ADMIN`.

## Frontend
Qualquer hospedagem de site estático serve (Vercel, Netlify, Cloudflare Pages):
```bash
npm ci && npm run build   # gera dist/
```
Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_DEFAULT_TENANT_SLUG`.
Configure o fallback de SPA (todas as rotas → `index.html`) e HTTPS (obrigatório para service worker e push).
