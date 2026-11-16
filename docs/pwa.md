# PWA e notificações

## Instalação
- `public/manifest.webmanifest`: nome, cores, ícones (inclui `maskable` para Android) e atalhos "Agendar" e "Pátio".
- `src/sw.ts` (vite-plugin-pwa em modo `injectManifest`): precache do build, navegação offline para o `index.html` e atualização automática a cada deploy.
- Android/Chrome: o banner "Instalar" aparece na tela inicial do cliente (`useInstallPrompt`). iPhone: Compartilhar → "Adicionar à Tela de Início" (o banner explica).

## Web Push
1. Gere as chaves: `npx web-push generate-vapid-keys`.
2. A pública vai no `.env` do app (`VITE_VAPID_PUBLIC_KEY`); a privada nos secrets:
   ```bash
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com
   npx supabase functions deploy notify-status
   ```
3. O cliente toca em **Ativar** na tela inicial; a inscrição vai para `push_subscriptions`.
4. Quando o operador move o carro para **Pronto**, o app chama `notify-status`, que manda o push para todos os aparelhos do cliente e apaga inscrições expiradas (404/410).

No iPhone o push só funciona com o app instalado na Tela de Início (iOS 16.4+).
