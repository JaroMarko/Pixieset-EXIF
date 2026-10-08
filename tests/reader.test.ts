import { afterEach, expect, test, vi } from 'vitest';
import { allowedImage, jpegMetadataComplete, readMetadata } from '../src/reader';
const url = 'https://images.pixieset.com/123/test-medium.jpg';
afterEach(() => vi.unstubAllGlobals());
test('allows only JPEG files from the exact Pixieset image host', () => {
  expect(allowedImage(url)).toBe(true);
  for (const input of ['https://images.pixieset.com.evil.test/photo.jpg', 'http://images.pixieset.com/test.jpg', 'https://user:pass@images.pixieset.com/test.jpg', 'https://images.pixieset.com:444/test.jpg', 'https://example.com/a.jpg']) expect(allowedImage(input)).toBe(false);
});
test('does not treat a truncated APP1 segment as missing EXIF', () => {
  expect(jpegMetadataComplete(new Uint8Array([255,216,255,225,0,20,69,120,105,102]))).toBe(false);
  expect(jpegMetadataComplete(new Uint8Array([255,216,255,218,0,2]))).toBe(true);
});
test('reads a synthetic EXIF camera model with the actual parser', async () => {
  // TIFF: little endian, one ASCII Model tag with an out-of-line value.
  const tiff = new Uint8Array([73,73,42,0,8,0,0,0,1,0,16,1,2,0,10,0,0,0,26,0,0,0,0,0,0,0,...new TextEncoder().encode('NIKON Z 6\0')]);
  const payload = new Uint8Array([69,120,105,102,0,0,...tiff]);
  const length = payload.length + 2;
  const jpeg = new Uint8Array([255,216,255,225,length >> 8,length & 255,...payload,255,218,0,2]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(jpeg, {status:206})));
  expect(await readMetadata(url)).toEqual({status:'ok',data: expect.objectContaining({camera:'NIKON Z 6'})});
});
test('distinguishes a valid JPEG without EXIF from a failed request', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([255,216,255,218,0,2]), {status:206})));
  expect(await readMetadata(url)).toEqual({ status:'missing' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status:403})));
  expect((await readMetadata(url)).status).toBe('error');
});
test('expands range when the first prefix is incomplete', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(new Uint8Array([255,216,255,225,0,20,69,120,105,102]), {status:206})).mockResolvedValueOnce(new Response(new Uint8Array([255,216,255,218,0,2]), {status:206}));
  vi.stubGlobal('fetch', fetchMock);
  expect((await readMetadata(url)).status).toBe('missing');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1].headers.Range).toBe('bytes=0-262143');
});
