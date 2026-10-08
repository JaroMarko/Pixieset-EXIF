import { flashLabel, lines, type Result } from './model';
import { DEFAULTS, settingsFrom, type Settings } from './settings';
import { photoKey, summarize, type Summary } from './stats';
type Entry = { image: HTMLImageElement; url: string; host: HTMLElement; label: HTMLElement; done: boolean; result?: Result };
const entries = new Map<HTMLImageElement, Entry>();
const queue = new Set<Entry>();
let enabled = false, active = 0, generation = 0;
let display: Settings = structuredClone(DEFAULTS);
let stored: Record<string, unknown> = {};
let revision = 0;
let scope = location.pathname;
let pointer = { x: -1, y: -1 };
const results = new Map<string, Result>();
const selector = 'li[data-id] img, .img-protect-holder img, .gamma-single-view > img, .pswp img, .fancybox-image';
function source(image: HTMLImageElement): string | undefined {
  try { const url = new URL(image.currentSrc || image.src, location.href); return url.hostname === 'images.pixieset.com' && url.protocol === 'https:' && /\.jpe?g$/i.test(url.pathname) ? url.href : undefined; } catch { return; }
}
const observer = new IntersectionObserver(changes => {
  for (const change of changes) { const entry = entries.get(change.target as HTMLImageElement); if (!entry) continue; if (change.isIntersecting && !entry.done) queue.add(entry); else queue.delete(entry); }
  pump();
}, { rootMargin: '150px' });
function attach(image: HTMLImageElement, url: string): Entry {
  const host = document.createElement('pixieset-exif-label');
  host.style.cssText = 'position:fixed;z-index:10001;pointer-events:none;display:none;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = ':host{all:initial}.label{box-sizing:border-box;color:#fff;background:rgba(15,23,29,.84);border-radius:5px;padding:6px 8px;font:11px/1.45 system-ui,sans-serif;white-space:pre-line;overflow-wrap:anywhere;text-shadow:none}.gear{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:2px}.camera{flex-shrink:0;max-width:45%}.lens{min-width:0;text-align:right;overflow-wrap:anywhere}.label.error{color:#ffd3b9}@media(min-width:1100px){.label{font-size:12px}}';
  const label = document.createElement('div'); label.className = 'label'; label.textContent = 'EXIF: načítavam…';
  shadow.append(style, label); document.documentElement.append(host);
  const entry: Entry = { image, url, host, label, done: false }; entries.set(image, entry); observer.observe(image); return entry;
}
function syncScope() {
  if (scope === location.pathname) return;
  scope = location.pathname; generation++; results.clear(); queue.clear(); observer.disconnect();
  for (const entry of entries.values()) entry.host.remove();
  entries.clear();
}
function scan() {
  syncScope();
  if (!enabled) return;
  for (const [image, entry] of entries) if (!image.isConnected || source(image) !== entry.url) { observer.unobserve(image); queue.delete(entry); entry.host.remove(); entries.delete(image); }
  for (const image of document.querySelectorAll<HTMLImageElement>(selector)) { const url = source(image); if (url && !entries.has(image)) attach(image, url); }
  position();
}
function position() {
  const gamma = document.querySelector<HTMLElement>('.gamma-single-view');
  const inDetail = gamma && getComputedStyle(gamma).display !== 'none';
  for (const entry of entries.values()) {
    const rect = entry.image.getBoundingClientRect();
    const hovered = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    const hasContent = entry.result?.status !== 'ok' || Boolean(entry.label.textContent);
    const visible = enabled && Object.values(display.fields).some(Boolean) && hasContent && (display.mode === 'always' || hovered) && !(inDetail && entry.image.closest('li[data-id]')) && rect.width >= 100 && rect.height >= 80 && rect.bottom > 0 && rect.top < innerHeight && entry.image.getClientRects().length && getComputedStyle(entry.image).visibility !== 'hidden';
    entry.host.style.display = visible ? 'block' : 'none';
    if (!visible) continue;
    entry.label.style.fontSize = `${display.fontSize}px`;
    entry.label.style.backgroundColor = `rgba(15,23,29,${display.opacity / 100})`;
    entry.host.style.width = `${Math.max(80, rect.width - 12)}px`;
    entry.host.style.left = `${rect.left + 6}px`;
    entry.host.style.top = `${rect.bottom - entry.host.getBoundingClientRect().height - 6}px`;
  }
}
async function readEntry(url: string): Promise<Result> {
  // Await inside an async function also catches synchronous throws after extension Reload.
  const cached = results.get(photoKey(url));
  if (cached?.status === 'ok') return cached;
  return await chrome.runtime.sendMessage({ type: 'read', url });
}
function stop() {
  setEnabled(false);
  mutations.disconnect();
  document.removeEventListener('pointermove', movePointer);
  document.removeEventListener('pointerout', leavePointer);
  document.removeEventListener('load', schedule, true);
  document.removeEventListener('scroll', schedule, true);
  window.removeEventListener('resize', schedule);
}
function pump() {
  while (enabled && active < 2 && queue.size) {
    const entry = queue.values().next().value!; queue.delete(entry);
    if (entry.done || !entry.image.isConnected) continue;
    entry.done = true; active++; const requestGeneration = generation;
    void readEntry(entry.url).then((result: Result) => {
      if (!enabled || generation !== requestGeneration || entries.get(entry.image) !== entry || source(entry.image) !== entry.url) return;
      record(entry.url, result);
      entry.result = result;
      render(entry);
      position();
    }).catch((error: unknown) => { if (generation === requestGeneration && enabled && entries.get(entry.image) === entry && source(entry.image) === entry.url) { if (error instanceof Error && /context invalidated/i.test(error.message)) { stop(); return; } record(entry.url, { status: 'error', message: 'Komunikácia s rozšírením zlyhala.' }); entry.label.textContent = 'EXIF: obnovte stránku'; position(); } }).finally(() => { active--; void pump(); });
  }
}
function record(url: string, result: Result) {
  const key = photoKey(url), previous = results.get(key);
  if (previous?.status === 'ok' && result.status !== 'ok') return;
  if (previous?.status === 'ok' && result.status === 'ok') {
    result = { status: 'ok', data: { ...previous.data, ...Object.fromEntries(Object.entries(result.data).filter(([, value]) => value !== undefined)) } };
  }
  results.set(key, result);
}
function render(entry: Entry) {
  const result = entry.result;
  if (!result) return;
  entry.label.classList.toggle('error', result.status === 'error');
  if (result.status !== 'ok') { entry.label.textContent = result.status === 'missing' ? 'EXIF nedostupný' : 'EXIF: chyba načítania'; return; }
  const data = result.data;
  const selected = { ...data, camera: undefined, focal: display.fields.focal ? data.focal : undefined, aperture: display.fields.aperture ? data.aperture : undefined, exposure: display.fields.exposure ? data.exposure : undefined, iso: display.fields.iso ? data.iso : undefined };
  const firstLine = lines(selected, display.fields.flash)[0] ?? '';
  const settings = document.createElement('div'); settings.textContent = firstLine;
  const gear = document.createElement('div'); gear.className = 'gear';
  const camera = document.createElement('span'); camera.className = 'camera'; camera.textContent = display.fields.camera ? data.camera ?? '' : '';
  const lens = document.createElement('span'); lens.className = 'lens'; lens.textContent = display.fields.lens ? data.lens ?? '' : '';
  gear.append(camera, lens); entry.label.replaceChildren();
  if (firstLine) entry.label.append(settings);
  if (camera.textContent || lens.textContent) entry.label.append(gear);
  entry.host.title = [flashLabel(data.flash), data.lens, 'Blesk: údaj zaznamenaný fotoaparátom.'].filter(Boolean).join('\n');
}
function applySettings(input: Record<string, unknown>) {
  display = settingsFrom(input);
  if (display.enabled !== enabled) setEnabled(display.enabled);
  else scan();
  for (const entry of entries.values()) render(entry);
  position();
}
function getSummary(): Summary {
  syncScope();
  const detected = new Set([...document.querySelectorAll<HTMLImageElement>(selector)].map(source).filter((url): url is string => Boolean(url)).map(photoKey)).size;
  return { ...summarize(results), detected, title: document.title, enabled };
}
function movePointer(event: PointerEvent) { pointer = { x: event.clientX, y: event.clientY }; if (enabled && display.mode === 'hover') position(); }
function leavePointer(event: PointerEvent) { if (event.relatedTarget === null) { pointer = { x: -1, y: -1 }; if (enabled && display.mode === 'hover') position(); } }
document.addEventListener('pointermove', movePointer, { passive: true });
document.addEventListener('pointerout', leavePointer, { passive: true });
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id === chrome.runtime.id && message && typeof message === 'object' && 'type' in message && message.type === 'summary') respond(getSummary());
});
function setEnabled(value: boolean) {
  enabled = value; generation++;
  if (!value) { queue.clear(); observer.disconnect(); for (const entry of entries.values()) entry.host.remove(); entries.clear(); }
  else scan();
}
let scheduled = false;
function schedule() { if (scheduled || !enabled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; scan(); }); }
const mutations = new MutationObserver(changes => { if (enabled && changes.some(change => change.type === 'attributes' ? !(change.target instanceof HTMLElement && change.target.tagName === 'PIXIESET-EXIF-LABEL') : [...change.addedNodes, ...change.removedNodes].some(node => node instanceof HTMLElement && node.tagName !== 'PIXIESET-EXIF-LABEL'))) schedule(); });
mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'style', 'class'] });
document.addEventListener('load', schedule, true);
document.addEventListener('scroll', schedule, { passive: true, capture: true });
window.addEventListener('resize', schedule, { passive: true });
chrome.storage.onChanged.addListener((changes, area) => { if (area !== 'local') return; revision++; for (const [key, change] of Object.entries(changes)) stored[key] = change.newValue; applySettings(stored); });
async function initialize() {
  try { const startRevision = revision; const input = await chrome.storage.local.get({ enabled: false, display: {} }); if (revision === startRevision) { stored = input; applySettings(stored); } }
  catch { stop(); }
}
void initialize();
