import type { Vehicle, VehicleCategory } from '@/lib/database.types';
import { normalizePlate } from '@/lib/plate';
import { supabase } from '@/lib/supabase';

export interface VehicleInput {
  plate: string;
  model: string;
  color: string;
  category: VehicleCategory;
  notes?: string | null;
}

export async function listMyVehicles(ownerId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('owner_id', ownerId).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createVehicle(tenantId: string, ownerId: string, input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...input, plate: normalizePlate(input.plate), tenant_id: tenantId, owner_id: ownerId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  const patch = input.plate ? { ...input, plate: normalizePlate(input.plate) } : input;
  const { data, error } = await supabase.from('vehicles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new Error('Este carro tem lavagens no histórico e não pode ser apagado.');
    throw error;
  }
}

/** Balcão: procura o carro pela placa para preencher a OS avulsa. */
export async function findByPlate(plate: string): Promise<Vehicle | null> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('plate', normalizePlate(plate)).maybeSingle();
  if (error) throw error;
  return data;
}
