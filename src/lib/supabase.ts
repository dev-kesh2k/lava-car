import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env, isSupabaseConfigured } from './env';

if (!isSupabaseConfigured) {
  console.warn('Supabase não configurado: copie .env.example para .env.local e preencha a URL e a anon key.');
}

/** Cliente único do Supabase (Auth, banco, Storage e Realtime). */
export const supabase = createClient<Database>(env.supabaseUrl || 'http://localhost:54321', env.supabaseAnonKey || 'anon', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 5 } },
});

export const PHOTOS_BUCKET = 'vehicle-photos';
