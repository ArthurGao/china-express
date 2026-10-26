// Warehouse photos are shrunk on the tablet before upload (design 07): long side 1600 px, WebP, about 300 KB.

export const MAX_SIDE = 1600;
export const WEBP_QUALITY = 0.8;

/** Pixel size that fits within `max` on the long side, keeping the aspect ratio; never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  // eslint-disable-next-line no-restricted-properties -- pixel sizes, not money (AGENTS.md rule 1 does not apply)
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Photo compression failed"))), "image/webp", WEBP_QUALITY),
  );
}
