import type { LoyaltyCard } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export async function getMyLoyaltyCard(customerId: string): Promise<LoyaltyCard | null> {
  const { data, error } = await supabase.from('loyalty_cards').select('*').eq('customer_id', customerId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function redeemReward(customerId: string): Promise<LoyaltyCard> {
  const { data, error } = await supabase.rpc('redeem_loyalty_reward', { p_customer: customerId });
  if (error) throw error;
  return data;
}
