import type { Damage, OsChecklist } from '@/lib/database.types';
import { compressImage } from '@/lib/image';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';

export const MAX_PHOTOS = 4;

export async function getChecklist(osId: string): Promise<OsChecklist | null> {
  const { data, error } = await supabase.from('os_checklist').select('*').eq('os_id', osId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Sobe a foto (já reduzida) para <tenant>/<os>/<timestamp>.jpg e devolve o caminho no bucket. */
export async function uploadChecklistPhoto(tenantId: string, osId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${tenantId}/${osId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function removeChecklistPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  if (error) throw error;
}

/** URLs temporárias (1 h) para mostrar as fotos do bucket privado. */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])));
}

export async function saveChecklist(
  tenantId: string,
  osId: string,
  createdBy: string,
  input: { photos: string[]; damages: Damage[]; notes: string },
): Promise<OsChecklist> {
  const { data, error } = await supabase
    .from('os_checklist')
    .upsert(
      { os_id: osId, tenant_id: tenantId, created_by: createdBy, photos: input.photos.slice(0, MAX_PHOTOS), damages: input.damages, notes: input.notes || null },
      { onConflict: 'os_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Quais OS do pátio já têm vistoria (para esconder o botão "Fazer vistoria"). */
export async function checklistOsIds(osIds: string[]): Promise<Set<string>> {
  if (!osIds.length) return new Set();
  const { data, error } = await supabase.from('os_checklist').select('os_id').in('os_id', osIds);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.os_id));
}
