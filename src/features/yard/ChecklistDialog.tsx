import { useEffect, useState } from 'react';
import type { OsWithDetails } from '@/api/appointments';
import { getChecklist, removeChecklistPhoto, saveChecklist, signedPhotoUrls, uploadChecklistPhoto } from '@/api/checklist';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/hooks/useAuth';
import type { Damage } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { formatPlate } from '@/lib/plate';
import { DamageMarker } from './DamageMarker';
import { describeDamages } from './damages';
import { PhotoCapture } from './PhotoCapture';

/** Vistoria de entrada: fotos + avarias + observação, gravadas antes de começar a lavar. */
export function ChecklistDialog({ os, onClose, onSaved }: { os: OsWithDetails | null; onClose: () => void; onSaved: (osId: string) => void }) {
  const { profile, tenant } = useSession();
  const [photos, setPhotos] = useState<string[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [damages, setDamages] = useState<Damage[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!os) return;
    setLoading(true);
    setError(null);
    getChecklist(os.id)
      .then(async (c) => {
        setPhotos(c?.photos ?? []);
        setDamages(c?.damages ?? []);
        setNotes(c?.notes ?? '');
        setUrls(await signedPhotoUrls(c?.photos ?? []));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [os]);

  async function addPhoto(file: File) {
    if (!os) return;
    try {
      const path = await uploadChecklistPhoto(tenant.id, os.id, file);
      setPhotos((p) => [...p, path]);
      setUrls((u) => ({ ...u, [path]: URL.createObjectURL(file) }));
    } catch (err) {
      setError(errorMessage(err, 'Falha ao enviar a foto.'));
    }
  }

  async function save() {
    if (!os) return;
    setBusy(true);
    setError(null);
    try {
      await saveChecklist(tenant.id, os.id, profile.id, { photos, damages, notes });
      onSaved(os.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!os} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Vistoria {os?.vehicle && formatPlate(os.vehicle.plate)}</DialogTitle>
          <DialogDescription>Fotografe o carro e marque avarias que já existiam.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <PhotoCapture
              photos={photos}
              urls={urls}
              onAdd={addPhoto}
              onRemove={(p) => {
                setPhotos((list) => list.filter((x) => x !== p));
                void removeChecklistPhoto(p).catch(() => {});
              }}
            />
            <div className="space-y-2">
              <Label>Avarias</Label>
              <DamageMarker value={damages} onChange={setDamages} />
              <p className="text-xs text-muted-foreground">{describeDamages(damages)}</p>
            </div>
            <Textarea placeholder="Observações (objetos no carro, nível de sujeira...)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            {error && <Alert kind="error">{error}</Alert>}
            <Button size="xl" className="w-full" disabled={busy} onClick={save}>
              Salvar vistoria
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
