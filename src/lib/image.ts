export async function cropAndCompressImage(
  file: File,
  options: { size?: number; quality?: number; minSize?: number } = {},
): Promise<File> {
  const { size = 512, quality = 0.8, minSize = 300 } = options;
  const bitmap = await createImageBitmap(file);
  const minSide = Math.min(bitmap.width, bitmap.height);
  if (minSide < minSize) {
    throw new Error(`Krótszy bok zdjęcia musi mieć min. ${minSize}px`);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Brak kontekstu canvas');

  const cropSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cropSize) / 2;
  const sy = (bitmap.height - cropSize) / 2;

  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, size, size);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Nie udało się utworzyć obrazu'))),
      'image/jpeg',
      quality,
    );
  });

  return new File([blob], `${file.name.replace(/\.[^/.]+$/, '') || 'photo'}.jpg`, {
    type: 'image/jpeg',
  });
}
