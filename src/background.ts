import { allowedImage, readMetadata } from './reader';
import type { Result } from './model';
const cache = new Map<string, Result>();
const pending = new Map<string, Promise<Result>>();
const controllers = new Set<AbortController>();
let enabled = false;
let ready = chrome.storage.local.get({ enabled: false }).then(settings => { enabled = settings.enabled === true; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.enabled) return;
  enabled = changes.enabled.newValue === true;
  ready = Promise.resolve();
  if (!enabled) for (const controller of controllers) controller.abort();
});
chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (!message || typeof message !== 'object' || !('type' in message) || message.type !== 'read' || !('url' in message) || typeof message.url !== 'string') return;
  const url = message.url;
  const senderUrl = sender.url ?? '';
  let validSender = false;
  try { const u = new URL(senderUrl); validSender = u.protocol === 'https:' && u.hostname.endsWith('.pixieset.com'); } catch { /* reject */ }
  if (sender.id !== chrome.runtime.id || !validSender || !allowedImage(url)) { respond({ status: 'error', message: 'Nepovolený zdroj.' }); return; }
  void (async () => {
    await ready;
    if (!enabled) return { status: 'error', message: 'Rozšírenie je vypnuté.' } satisfies Result;
    const hit = cache.get(url); if (hit) { cache.delete(url); cache.set(url, hit); return hit; }
    const existing = pending.get(url); if (existing) return existing;
    if (pending.size >= 4) return { status: 'error', message: 'Skúste načítať údaje znova.' } satisfies Result;
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 12000);
    const request = readMetadata(url, controller.signal).then(result => {
      if (result.status !== 'error') { cache.set(url, result); if (cache.size > 500) cache.delete(cache.keys().next().value!); }
      return result;
    }).finally(() => { clearTimeout(timeout); controllers.delete(controller); pending.delete(url); });
    pending.set(url, request); return request;
  })().then(respond, () => respond({ status: 'error', message: 'Načítanie zlyhalo.' }));
  return true;
});
