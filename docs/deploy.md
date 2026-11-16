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
