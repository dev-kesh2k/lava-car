import type { AppRole, Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(userId: string, patch: { full_name?: string; phone?: string | null }): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}

/** Equipe da loja (dono e operadores) para comissões e atribuição de OS. */
export async function listStaff(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['ADMIN', 'OPERATOR']).order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function searchCustomers(term: string): Promise<Profile[]> {
  const t = term.trim().replace(/[%,()]/g, '');
  let q = supabase.from('profiles').select('*').eq('role', 'CUSTOMER').order('full_name').limit(20);
  if (t) q = q.or(`full_name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Só o dono: muda papel, comissão ou desativa alguém da loja (o banco confere). */
export async function updateStaffMember(id: string, patch: { role?: AppRole; commission_pct?: number; active?: boolean }): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
