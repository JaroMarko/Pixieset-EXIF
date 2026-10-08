import { expect, test } from 'vitest';
import { photoKey, summarize } from '../src/stats';
import type { Result } from '../src/model';
test('flash denominator excludes unavailable metadata and failed requests', () => {
  const results = new Map<string, Result>([
    ['a', { status: 'ok', data: { flash: 15, camera: 'NIKON Z 6', lens: '35mm', iso: 100, aperture: 1.8 } }],
    ['b', { status: 'ok', data: { flash: 0, camera: 'NIKON Z 6II', lens: '35mm', iso: 1600, aperture: 4 } }],
    ['c', { status: 'ok', data: { camera: 'NIKON Z 6' } }],
    ['d', { status: 'missing' }], ['e', { status: 'error', message: 'Network' }],
  ]);
  expect(summarize(results)).toMatchObject({ checked: 5, available: 3, missing: 1, errors: 1, flash: { known: 2, fired: 1, unknown: 2 }, iso: { min: 100, max: 1600, count: 2 }, cameras: [{ name: 'NIKON Z 6', count: 2 }, { name: 'NIKON Z 6II', count: 1 }], lenses: [{ name: '35mm', count: 2 }] });
});
test('preview and lightbox variants identify one photo but different albums stay separate', () => {
  expect(photoKey('https://images.pixieset.com/123/abc-medium.jpg')).toBe(photoKey('https://images.pixieset.com/123/abc-xxlarge.jpg'));
  expect(photoKey('https://images.pixieset.com/123/abc-medium.jpg')).not.toBe(photoKey('https://images.pixieset.com/124/abc-medium.jpg'));
});
test('empty summary has no invented ISO or flash percentage', () => {
  expect(summarize(new Map())).toMatchObject({ checked: 0, iso: null, flash: { known: 0, fired: 0, unknown: 0 } });
});

test('focal lengths use recorded millimetres and group exact values', () => {
  const data = new Map<string, Result>([
    ['a', {status:'ok',data:{focal:35}}], ['b', {status:'ok',data:{focal:35}}],
    ['c', {status:'ok',data:{focal:85}}], ['d', {status:'ok',data:{focal:24.5}}],
    ['e', {status:'ok',data:{focal:0}}], ['f', {status:'missing'}]
  ]);
  expect(summarize(data).focals).toEqual([{name:'35 mm',count:2},{name:'24.5 mm',count:1},{name:'85 mm',count:1}]);
});
