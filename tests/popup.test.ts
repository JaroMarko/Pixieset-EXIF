// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
test('popup presents partial statistics and persists a field change', async () => {
  document.documentElement.innerHTML = readFileSync('public/popup.html', 'utf8').replace(/<!doctype html>/i, '');
  const set = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', { storage: { local: { get: async () => ({ enabled: true }), set } }, tabs: { query: async () => [{ id: 7 }], sendMessage: async () => ({ checked: 3, available: 2, missing: 1, errors: 0, detected: 10, title: 'Test galéria', cameras: [{ name: 'NIKON Z 6', count: 2 }], lenses: [], apertures: [], iso: { min: 100, max: 800, count: 2 }, flash: { fired: 1, known: 2, unknown: 1 } }) } });
  const interval = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>);
  await import('../src/popup');
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(document.getElementById('checked')!.textContent).toBe('3');
  expect(document.getElementById('flash')!.textContent).toBe('50 % s bleskom');
  expect(document.getElementById('scope')!.textContent).toContain('Iba fotky');
  const lens = document.querySelector<HTMLInputElement>('[data-field=lens]')!;
  lens.checked = false; lens.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(set).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, display: expect.objectContaining({ fields: expect.objectContaining({ lens: false }) }) }));
  document.getElementById('reset')!.click();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(set).toHaveBeenLastCalledWith(expect.objectContaining({enabled:true,display:expect.objectContaining({fontSize:12,opacity:84,fields:expect.objectContaining({lens:true})})}));
  interval.mockRestore(); vi.unstubAllGlobals();
});
