export const TESTIMONIAL_BUCKET = 'cado-testimonios';
export const MAX_TESTIMONIAL_BYTES = 2 * 1024 * 1024;
export const TESTIMONIAL_FIELDS = 'id,titulo,texto_alternativo,source_url,publicado,created_at';
export interface Testimonial {
  id: string;
  titulo: string;
  texto_alternativo: string;
  source_url: string;
  publicado: boolean;
  created_at: string;
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
}
export function googleReviewUrl(value: string): string | null {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    const validHost = url.hostname === 'google.com' || url.hostname.endsWith('.google.com') || url.hostname === 'share.google' || url.hostname === 'maps.app.goo.gl';
    return url.protocol === 'https:' && validHost && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function testimonialImageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 12 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}
