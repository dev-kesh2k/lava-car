// Variáveis de ambiente do Vite, conferidas uma vez só.
function read(name: string): string {
  return (import.meta.env[name] as string | undefined)?.trim() ?? '';
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  vapidPublicKey: read('VITE_VAPID_PUBLIC_KEY'),
  defaultTenantSlug: read('VITE_DEFAULT_TENANT_SLUG') || 'lava-car-demo',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
