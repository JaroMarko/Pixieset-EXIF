// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { createPanel } from '../src/panel';
import type { Summary } from '../src/stats';
test('icon rail updates, expands left, collapses and can be hidden and restored', () => {
  let root: ShadowRoot;
  const original = HTMLElement.prototype.attachShadow;
  const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function(init) { root = original.call(this, init); return root; });
  const onSection = vi.fn();
  const panel = createPanel(onSection);
  const summary: Summary = { checked: 4, available: 3, missing: 1, errors: 0, cameras: [{ name: '<img src=x onerror=alert(1)>', count: 3 }], lenses: [], sectionSupported: true, focals: [{name:'35 mm',count:3}], apertures: [{ name: 'f/1.8', count: 3 }], iso: { min: 100, max: 800, count: 3 }, flash: { fired: 1, known: 2, unknown: 2 }, detected: 4, title: 'Gallery', enabled: true };
  panel.update(summary);
  const host = document.querySelector<HTMLElement>('pixieset-exif-panel')!;
  const rail = root!.querySelector<HTMLButtonElement>('.rail')!;
  const detail = root!.querySelector<HTMLElement>('.detail')!;
  expect([...rail.querySelectorAll('b')].map(x => x.textContent)).toEqual(['4', '1', '0', '50%']);
  expect(rail.querySelectorAll('svg')).toHaveLength(4);
  expect(detail.hidden).toBe(true);
  expect(root!.querySelector('img')).toBeNull(); // EXIF text is never interpreted as HTML.
  rail.click(); expect(detail.hidden).toBe(false);
  expect(rail.getAttribute('aria-expanded')).toBe('true');
  expect(detail.textContent).toContain('doteraz skontrolovaných 4');
  root!.querySelector<HTMLButtonElement>('.scan')!.click(); expect(onSection).toHaveBeenCalledTimes(1);
  document.dispatchEvent(new Event('scroll')); expect(detail.hidden).toBe(false);
  panel.update({ ...summary, checked: 5 }); expect(detail.hidden).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); expect(detail.hidden).toBe(true);
  rail.click(); document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); expect(detail.hidden).toBe(true);
  rail.click(); root!.querySelector<HTMLButtonElement>('[aria-label="Zbaliť prehľad"]')!.click();
  expect(detail.hidden).toBe(true);
  expect(root!.querySelector('[aria-label="Skryť panel"]')).toBeNull();
  panel.toggle();
  expect(host.style.display).toBe('none');
  panel.update(summary); expect(host.style.display).toBe('none');
  expect(panel.toggle()).toBe(true); expect(host.style.display).toBe('block');
  panel.update({ ...summary, enabled: false }); expect(host.style.display).toBe('none');
  panel.destroy(); expect(host.isConnected).toBe(false); spy.mockRestore();
});
