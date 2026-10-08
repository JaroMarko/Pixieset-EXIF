import { expect, test } from 'vitest';
import { flashLabel, exposureLabel, normalize, hasMetadata, lines, compactFlash } from '../src/model';
test('preserves absent flash versus flash not fired', () => {
  expect(flashLabel(undefined)).toContain('údaj chýba');
  expect(flashLabel(0)).toBe('Blesk: nie');
  expect(flashLabel(15)).toBe('Blesk: áno · vynútený režim');
  expect(flashLabel(24)).toBe('Blesk: nie · automatický režim');
  expect(flashLabel(32)).toContain('bez funkcie');
  expect(flashLabel(65)).toContain('redukcia červených očí');
});
test('formats exposure and keeps actual focal length', () => {
  expect(exposureLabel(1 / 60)).toBe('1/60 s');
  expect(exposureLabel(2.5)).toBe('2.5 s');
  expect(lines({ focal: 35, aperture: 1.8, exposure: 1/60, iso: 160, camera: 'Nikon Z 6', flash: 15 })[0]).toBe('35 mm · f/1.8 · 1/60 s · ISO 160 · ⚡️');
});
test('normalizes only useful metadata and rejects invalid numeric tags', () => {
  expect(hasMetadata(normalize({ DateTime: '2020', GPSLatitude: 42 }))).toBe(false);
  expect(normalize({ ISO: NaN, ISOSpeedRatings: 100, Model: ' NIKON Z 6 ' })).toMatchObject({ iso: 100, camera: 'NIKON Z 6' });
  expect(hasMetadata(normalize({ Flash: 0 }))).toBe(true);
});

test('shows a colored flash icon only when EXIF records firing', () => {
  expect(compactFlash(15)).toBe('⚡️');
  expect(compactFlash(25)).toBe('⚡️');
  expect(compactFlash(24)).toBe('');
  expect(compactFlash(undefined)).toBe('Blesk: ?');
  expect(compactFlash(32)).toBe('');
  expect(lines({camera:'NIKON Z 6II',flash:15})).toEqual(['⚡️','NIKON Z 6II']);
});
