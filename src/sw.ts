/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Precache do build (lista injetada pelo vite-plugin-pwa).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: qualquer navegação abre o index.html do cache (funciona offline e instalado).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/auth\/v1/, /^\/rest\/v1/] }));

self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// Web Push: "Seu carro está pronto!" (enviado pela Edge Function notify-status).
self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Lava Car', {
      body: data.body ?? 'Seu carro está pronto para retirada!',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag ?? 'lava-car',
      data: { url: data.url ?? '/' },
    }),
  );
});

// Toque na notificação: foca a aba aberta do app ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) return open.focus().then((c) => c.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
