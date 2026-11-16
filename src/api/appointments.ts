import type { AppointmentOS, OsItem, OsStatus, PaymentMethod, PaymentStatus, Vehicle, VehicleCategory } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/** OS com o carro e os itens, como as telas usam. */
export type OsWithDetails = AppointmentOS & { vehicle: Vehicle | null; items: OsItem[] };

const DETAILS = '*, vehicle:vehicles(*), items:os_items(*)';

export async function getBusyIntervals(from: Date, to: Date) {
  const { data, error } = await supabase.rpc('get_busy_intervals', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw error;
  return data ?? [];
}

export interface BookingInput {
  vehicleId: string;
  serviceId: string;
  addonIds: string[];
  scheduledAt: string;
  payment: PaymentMethod;
  notes?: string;
}

export async function bookAppointment(b: BookingInput): Promise<AppointmentOS> {
  const { data, error } = await supabase.rpc('book_appointment', {
    p_vehicle: b.vehicleId,
    p_service: b.serviceId,
    p_addons: b.addonIds,
    p_scheduled_at: b.scheduledAt,
    p_payment: b.payment,
    p_notes: b.notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_appointment', { p_os: id });
  if (error) throw error;
}

/** Agendamentos do cliente: ativos primeiro (mais próximos), depois o histórico. */
export async function listMyAppointments(customerId: string, limit = 30): Promise<OsWithDetails[]> {
  const { data, error } = await supabase
    .from('appointments_os')
    .select(DETAILS)
    .eq('customer_id', customerId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as OsWithDetails[];
}

export async function getOs(id: string): Promise<OsWithDetails> {
  const { data, error } = await supabase.from('appointments_os').select(DETAILS).eq('id', id).single();
  if (error) throw error;
  return data as unknown as OsWithDetails;
}

/** Pátio do dia: tudo que não foi entregue/cancelado, mais os entregues de hoje. */
export async function listYard(fromIso: string, toIso: string): Promise<OsWithDetails[]> {
  const { data, error } = await supabase
    .from('appointments_os')
    .select(DETAILS)
    .or(`status.in.(WAITING,WASHING,FINISHING,READY),and(status.eq.SCHEDULED,scheduled_at.gte.${fromIso},scheduled_at.lt.${toIso})`)
    .order('scheduled_at');
  if (error) throw error;
  return (data ?? []) as unknown as OsWithDetails[];
}

export async function setOsStatus(id: string, status: OsStatus): Promise<void> {
  const { error } = await supabase.from('appointments_os').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function setPaymentStatus(id: string, payment_status: PaymentStatus): Promise<void> {
  const { error } = await supabase.from('appointments_os').update({ payment_status }).eq('id', id);
  if (error) throw error;
}

export async function assignEmployee(id: string, employeeId: string | null): Promise<void> {
  const { error } = await supabase.from('appointments_os').update({ employee_id: employeeId }).eq('id', id);
  if (error) throw error;
}

export interface WalkInInput {
  plate: string;
  category: VehicleCategory;
  serviceId: string;
  addonIds: string[];
  model: string;
  color: string;
  customerName: string;
  customerPhone: string;
}

export async function openWalkIn(w: WalkInInput): Promise<AppointmentOS> {
  const { data, error } = await supabase.rpc('open_walk_in', {
    p_plate: w.plate,
    p_category: w.category,
    p_service: w.serviceId,
    p_addons: w.addonIds,
    p_model: w.model,
    p_color: w.color,
    p_customer_name: w.customerName,
    p_customer_phone: w.customerPhone || null,
  });
  if (error) throw error;
  return data;
}
