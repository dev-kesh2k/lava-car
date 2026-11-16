import type { Tenant } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTenant(id: string): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateTenant(id: string, patch: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
