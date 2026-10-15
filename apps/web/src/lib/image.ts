/** Client-side image intake: validate → downscale → data URL for local persistence. */

const MAX_INPUT_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_EDGE_PX = 640;
const JPEG_QUALITY = 0.82;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export const IMAGE_ACCEPT_ATTR = ACCEPTED.join(',');

/**
 * Reads an image file into a compact data URL.
 * Throws a user-facing Error on wrong type, oversize, or unreadable data.
 */
export async function fileToImageDataUrl(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image is too large — keep it under 3 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file could not be read as an image.'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unavailable in this browser.');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
