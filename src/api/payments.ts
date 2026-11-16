import { supabase } from '@/lib/supabase';

export interface PixCharge {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
  amount: number;
}

/** Gera (ou reaproveita) a cobrança Pix da OS pela Edge Function create-pix. */
export async function createPixCharge(osId: string): Promise<PixCharge> {
  const { data, error } = await supabase.functions.invoke<PixCharge>('create-pix', { body: { os_id: osId } });
  if (error) throw error;
  if (!data) throw new Error('Não foi possível gerar o Pix.');
  return data;
}
