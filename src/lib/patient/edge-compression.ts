// src/lib/patient/edge-compression.ts

export type CompressionResult = {
  blob: Blob;
  bytesIn: number;
  bytesOut: number;
  width: number;
  height: number;
  mime: string;
  msElapsed: number;
  passthrough: boolean;
};

const DEFAULT_MAX_EDGE = 2048;
const DEFAULT_QUALITY = 0.82;

function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas');
  return c.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Downscales + re-encodes a capture on-device before it ever touches the wire.
 * DICOM / PDF / non-raster payloads pass through untouched to preserve
 * assessment fidelity and metadata.
 */
export async function compressForEdge(
  file: File,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<CompressionResult> {
  const started = performance.now();
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  const isRaster = file.type.startsWith('image/') && !/dicom|tiff/i.test(file.type);
  if (!isRaster) {
    return {
      blob: file, bytesIn: file.size, bytesOut: file.size,
      width: 0, height: 0, mime: file.type || 'application/octet-stream',
      msElapsed: performance.now() - started, passthrough: true,
    };
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const mime = supportsWebP() ? 'image/webp' : 'image/jpeg';

  let blob: Blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false })!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await canvas.convertToBlob({ type: mime, quality });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), mime, quality),
    );
  }
  bitmap.close?.();

  // Never ship a "compressed" file that is larger than the source.
  const useOriginal = blob.size >= file.size;
  return {
    blob: useOriginal ? file : blob,
    bytesIn: file.size,
    bytesOut: useOriginal ? file.size : blob.size,
    width, height,
    mime: useOriginal ? file.type : mime,
    msElapsed: performance.now() - started,
    passthrough: useOriginal,
  };
}

export async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
