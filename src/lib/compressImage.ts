const MAX_WEBP_SIZE = 500 * 1024;
const MAX_DIMENSIONS = [1920, 1600, 1280, 1024, 800, 640];
const WEBP_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5];

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== 'image/webp') {
        reject(new Error('Este navegador no pudo convertir la imagen a WebP.'));
        return;
      }
      resolve(blob);
    }, 'image/webp', quality);
  });
}

export async function compressImageToWebp(image: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(image);
  } catch {
    throw new Error('No se pudo abrir la imagen seleccionada.');
  }

  try {
    const sourceMaxDimension = Math.max(bitmap.width, bitmap.height);
    const dimensions = MAX_DIMENSIONS.filter((dimension) => dimension < sourceMaxDimension);
    dimensions.unshift(Math.min(sourceMaxDimension, MAX_DIMENSIONS[0]));
    const sizes = [...new Set(dimensions)];
    let smallestBlob: Blob | null = null;

    for (const maxDimension of sizes) {
      const scale = Math.min(1, maxDimension / sourceMaxDimension);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen para comprimirla.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of WEBP_QUALITIES) {
        const blob = await canvasToWebp(canvas, quality);
        if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
        if (blob.size <= MAX_WEBP_SIZE) {
          return new File([blob], `${image.name.replace(/\.[^.]+$/, '') || 'imagen'}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
        }
      }
    }

    if (!smallestBlob) throw new Error('No se pudo comprimir la imagen.');
    return new File([smallestBlob], `${image.name.replace(/\.[^.]+$/, '') || 'imagen'}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
