import type { CashEntry, CommissionRow, DashboardSummary } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export async function getDashboard(from: string, to: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('dashboard_summary', { p_from: from, p_to: to });
  if (error) throw error;
  return data;
}

export async function getCommissions(from: string, to: string): Promise<CommissionRow[]> {
  const { data, error } = await supabase.rpc('commission_report', { p_from: from, p_to: to });
  if (error) throw error;
  return data ?? [];
}

export async function listCashEntries(from: string, to: string): Promise<CashEntry[]> {
  const { data, error } = await supabase
    .from('cash_entries')
    .select('*')
    .gte('occurred_on', from)
    .lte('occurred_on', to)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addExpense(
  tenantId: string,
  createdBy: string,
  e: { category: string; description: string; amount: number; occurred_on: string },
): Promise<CashEntry> {
  const { data, error } = await supabase
    .from('cash_entries')
    .insert({ ...e, tenant_id: tenantId, created_by: createdBy, type: 'EXPENSE' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCashEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cash_entries').delete().eq('id', id).is('os_id', null);
  if (error) throw error;
}
