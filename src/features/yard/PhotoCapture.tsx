import { Camera, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { MAX_PHOTOS } from '@/api/checklist';

/** Até 4 fotos pela câmera traseira do celular/tablet (o input capture abre a câmera direto). */
export function PhotoCapture({
  photos,
  urls,
  onAdd,
  onRemove,
}: {
  photos: string[];
  urls: Record<string, string>;
  onAdd: (file: File) => Promise<void>;
  onRemove: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) await onAdd(f);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {photos.map((p) => (
        <div key={p} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
          {urls[p] && <img src={urls[p]} alt="Foto da vistoria" className="h-full w-full object-cover" />}
          <button type="button" onClick={() => onRemove(p)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label="Remover foto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
          <span className="text-[11px]">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => handle(e.target.files)} />
    </div>
  );
}
