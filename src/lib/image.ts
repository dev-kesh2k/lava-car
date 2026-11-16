// Fotos da vistoria: reduz no próprio aparelho antes de subir (câmera do celular gera 4–8 MB).

/** Tamanho final mantendo a proporção, com o lado maior limitado a maxSide. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxSide) return { width, height };
  const k = maxSide / largest;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** Converte a foto em JPEG de até maxSide px (qualidade 0.8). */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality));
}
