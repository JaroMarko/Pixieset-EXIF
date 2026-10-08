import * as exifr from 'exifr';
import { TAGS, hasMetadata, normalize, type Result } from './model';
export function allowedImage(url: string): boolean {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'images.pixieset.com' && !u.username && !u.password && (!u.port || u.port === '443') && /\.jpe?g$/i.test(u.pathname); } catch { return false; }
}
// A JPEG APP1 segment has a 16-bit length; grow the prefix until its full payload is available.
export function jpegMetadataComplete(bytes: Uint8Array): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Nepodporovaný formát fotografie.');
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Neplatný JPEG súbor.');
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return true;
    if (marker === 0xff) { offset++; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) throw new Error('Neplatný JPEG segment.');
    const end = offset + 2 + length;
    if (end > bytes.length) return false;
    if (marker === 0xe1 && bytes[offset + 4] === 69 && bytes[offset + 5] === 120 && bytes[offset + 6] === 105 && bytes[offset + 7] === 102) return true;
    offset = end;
  }
  return false;
}
export async function readMetadata(url: string, signal?: AbortSignal): Promise<Result> {
  if (!allowedImage(url)) return { status: 'error', message: 'Nepodporovaný zdroj fotografie.' };
  try {
    for (const length of [65536, 262144, 1048576]) {
      const response = await fetch(url, { headers: { Range: `bytes=0-${length - 1}` }, credentials: 'omit', redirect: 'error', signal });
      if (!response.ok || !response.body) throw new Error('Fotografiu sa nepodarilo načítať.');
      const reader = response.body.getReader();
      const parts: Uint8Array[] = []; let count = 0;
      try {
        while (count < length) { const chunk = await reader.read(); if (chunk.done) break; const part = chunk.value.subarray(0, length - count); parts.push(part); count += part.length; }
      } finally { await reader.cancel(); }
      const bytes = new Uint8Array(count); let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.length; }
      if (!jpegMetadataComplete(bytes)) continue;
      const tags: Record<string, unknown> | undefined = await exifr.parse(bytes, { pick: TAGS, translateValues: false, makerNote: false });
      const data = normalize(tags);
      return hasMetadata(data) ? { status: 'ok', data } : { status: 'missing' };
    }
    return { status: 'error', message: 'Metadáta prekročili limit načítania.' };
  } catch { return { status: 'error', message: signal?.aborted ? 'Načítanie zastavené.' : 'Fotografiu alebo EXIF sa nepodarilo načítať.' }; }
}
