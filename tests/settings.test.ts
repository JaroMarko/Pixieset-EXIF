import { expect, test } from 'vitest';
import { settingsFrom } from '../src/settings';
test('migrates the original enabled setting with all display fields visible', () => {
  expect(settingsFrom({ enabled: true })).toMatchObject({ enabled: true, fontSize: 12, opacity: 84, mode: 'always', fields: { camera: true, lens: true } });
});
test('bounds values and preserves explicit field choices', () => {
  expect(settingsFrom({ enabled: true, display: { fontSize: 100, opacity: 0, mode: 'hover', fields: { lens: false, iso: false } } })).toMatchObject({ fontSize: 16, opacity: 35, mode: 'hover', fields: { lens: false, iso: false, flash: true } });
  expect(settingsFrom({ display: { fontSize: NaN, opacity: 'invalid' } })).toMatchObject({ fontSize: 12, opacity: 84 });
});
