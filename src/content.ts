import { flashLabel, lines, type Result } from './model';
type Entry = { image: HTMLImageElement; url: string; host: HTMLElement; label: HTMLElement; done: boolean };
const entries = new Map<HTMLImageElement, Entry>();
const queue = new Set<Entry>();
let enabled = false, active = 0, generation = 0;
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
  style.textContent = ':host{all:initial}.label{box-sizing:border-box;color:#fff;background:rgba(15,23,29,.84);border-radius:5px;padding:6px 8px;font:11px/1.45 system-ui,sans-serif;white-space:pre-line;overflow-wrap:anywhere;text-shadow:none}.label.error{color:#ffd3b9}@media(min-width:1100px){.label{font-size:12px}}';
  const label = document.createElement('div'); label.className = 'label'; label.textContent = 'EXIF: načítavam…';
  shadow.append(style, label); document.documentElement.append(host);
  const entry = { image, url, host, label, done: false }; entries.set(image, entry); observer.observe(image); return entry;
}
function scan() {
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
    const visible = enabled && !(inDetail && entry.image.closest('li[data-id]')) && rect.width >= 100 && rect.height >= 80 && rect.bottom > 0 && rect.top < innerHeight && entry.image.getClientRects().length && getComputedStyle(entry.image).visibility !== 'hidden';
    entry.host.style.display = visible ? 'block' : 'none';
    if (!visible) continue;
    entry.host.style.width = `${Math.max(80, rect.width - 12)}px`;
    entry.host.style.left = `${rect.left + 6}px`;
    entry.host.style.top = `${rect.bottom - entry.host.getBoundingClientRect().height - 6}px`;
  }
}
async function pump() {
  while (enabled && active < 2 && queue.size) {
    const entry = queue.values().next().value!; queue.delete(entry);
    if (entry.done || !entry.image.isConnected) continue;
    entry.done = true; active++; const requestGeneration = generation;
    void chrome.runtime.sendMessage({ type: 'read', url: entry.url }).then((result: Result) => {
      if (!enabled || generation !== requestGeneration || entries.get(entry.image) !== entry || source(entry.image) !== entry.url) return;
      if (result?.status === 'ok') { entry.label.textContent = lines(result.data).join('\n'); entry.host.title = [flashLabel(result.data.flash), result.data.lens, 'Blesk: údaj zaznamenaný fotoaparátom.'].filter(Boolean).join('\n'); }
      else { entry.label.textContent = result?.status === 'missing' ? 'EXIF nedostupný' : 'EXIF: chyba načítania'; entry.label.classList.toggle('error', result?.status !== 'missing'); }
      position();
    }).catch(() => { if (generation === requestGeneration && enabled) { entry.label.textContent = 'EXIF: obnovte stránku'; position(); } }).finally(() => { active--; void pump(); });
  }
}
function setEnabled(value: boolean) {
  enabled = value; generation++;
  if (!value) { queue.clear(); observer.disconnect(); for (const entry of entries.values()) entry.host.remove(); entries.clear(); }
  else scan();
}
let scheduled = false;
function schedule() { if (scheduled || !enabled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; scan(); }); }
new MutationObserver(changes => { if (enabled && changes.some(change => change.type === 'attributes' ? !(change.target instanceof HTMLElement && change.target.tagName === 'PIXIESET-EXIF-LABEL') : [...change.addedNodes, ...change.removedNodes].some(node => node instanceof HTMLElement && node.tagName !== 'PIXIESET-EXIF-LABEL'))) schedule(); }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'style', 'class'] });
document.addEventListener('load', schedule, true);
document.addEventListener('scroll', schedule, { passive: true, capture: true });
window.addEventListener('resize', schedule, { passive: true });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.enabled) setEnabled(changes.enabled.newValue === true); });
void chrome.storage.local.get({ enabled: false }).then(settings => setEnabled(settings.enabled === true));
