# PWA e notificações

## Instalação
- `public/manifest.webmanifest`: nome, cores, ícones (inclui `maskable` para Android) e atalhos "Agendar" e "Pátio".
- `src/sw.ts` (vite-plugin-pwa em modo `injectManifest`): precache do build, navegação offline para o `index.html` e atualização automática a cada deploy.
- Android/Chrome: o banner "Instalar" aparece na tela inicial do cliente (`useInstallPrompt`). iPhone: Compartilhar → "Adicionar à Tela de Início" (o banner explica).
