import { env } from '@/lib/env';

const KEY = 'lavacar:loja';

/** Loja do cadastro: ?loja=<slug> no link de convite (fica guardada), senão a padrão do .env. */
export function currentTenantSlug(search = window.location.search): string {
  const fromUrl = new URLSearchParams(search).get('loja')?.trim().toLowerCase();
  if (fromUrl && /^[a-z0-9][a-z0-9-]{1,62}$/.test(fromUrl)) {
    localStorage.setItem(KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(KEY) || env.defaultTenantSlug;
}
