import { photoKey } from './stats';
import type { Result } from './model';
export type SectionConfig = { origin: string; collection: string; id: string; slug: string };
export type SectionProgress = { status: 'idle' | 'loading' | 'running' | 'done' | 'stopped' | 'error'; total: number | null; processed: number; unsupported: number; message?: string };
const idle = (): SectionProgress => ({ status: 'idle', total: null, processed: 0, unsupported: 0 });
export function sectionConfig(doc: Document, href: string): SectionConfig | undefined {
  const url = new URL(href), parts = url.pathname.split('/').filter(Boolean);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.pixieset.com') || parts.length !== 2 || parts.some(p => !/^[a-zA-Z0-9_-]+$/.test(p))) return;
  // Read the inline configuration as text; never execute gallery code.
  const script = [...doc.scripts].map(s => s.textContent ?? '').find(s => s.includes('PixiesetClient.init('));
  const id = script?.match(/['"]collectionId['"]\s*:\s*(\d+)/)?.[1];
  const rawKey = script?.match(/['"]collectionUrlKey['"]\s*:\s*'([^']*)'/)?.[1];
  const key = rawKey?.replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (!id || !key || key !== parts[0] || /['"]clientDownloads['"]\s*:\s*true/.test(script!) || (script!.match(/['"]favKey['"]\s*:\s*([^,}]+)/)?.[1].trim() ?? 'null') !== 'null') return;
  return { origin: url.origin, collection: key, id, slug: parts[1] };
}
export async function listSection(config: SectionConfig, signal: AbortSignal, progress: (count: number) => void): Promise<{ urls: string[]; unsupported: number }> {
  const urls = new Map<string, string>(), ids = new Set<string>(); let unsupported = 0;
  for (let page = 1; page <= 200; page++) {
    signal.throwIfAborted();
    const url = new URL('/client/loadphotos/', config.origin);
    url.search = new URLSearchParams({ cuk: config.collection, cid: config.id, gs: config.slug, page: String(page), size: '64' }).toString();
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), redirect: 'error' });
    if (!response.ok) throw new Error('Zoznam sekcie sa nepodarilo načítať.');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'success' || !('content' in data) || typeof data.content !== 'string' || !('isLastPage' in data) || typeof data.isLastPage !== 'boolean') throw new Error('Pixieset neposkytol potvrdený zoznam sekcie.');
    const photos: unknown = data.content === '' ? [] : JSON.parse(data.content);
    if (!Array.isArray(photos)) throw new Error('Nepodporovaný zoznam fotografií.');
    let added = 0;
    for (const photo of photos) {
      if (!photo || typeof photo !== 'object' || !('id' in photo) || !['number', 'string'].includes(typeof photo.id)) throw new Error('Neplatný záznam fotografie.');
      const id = String(photo.id); if (ids.has(id)) continue; ids.add(id); added++;
      let image: URL | undefined;
      if ('pathMedium' in photo && typeof photo.pathMedium === 'string') { try { image = new URL(photo.pathMedium, config.origin); } catch { /* unsupported */ } }
      if (!image || image.protocol !== 'https:' || image.hostname !== 'images.pixieset.com' || image.username || image.password || image.port || !/\.jpe?g$/i.test(image.pathname)) { unsupported++; continue; }
      urls.set(photoKey(image.href), image.href);
    }
    progress(ids.size);
    if (data.isLastPage) return { urls: [...urls.values()], unsupported };
    if (!added) throw new Error('Zoznam sa opakuje alebo nemá potvrdený koniec.');
  }
  throw new Error('Sekcia prekročila limit 12 800 záznamov. Kontrola nie je úplná.');
}
export class SectionScan {
  state: SectionProgress = idle();
  private controller?: AbortController;
  constructor(private readonly deps: {
    list: typeof listSection;
    read: (url: string, signal: AbortSignal) => Promise<Result>;
    known: (url: string) => Result | undefined;
    record: (url: string, result: Result) => void;
    changed: () => void;
  }) {}
  get running() { return this.state.status === 'loading' || this.state.status === 'running'; }
  stop() { if (!this.running) return; this.controller?.abort(); this.state = { ...this.state, status: 'stopped' }; this.deps.changed(); }
  reset() { this.controller?.abort(); this.controller = undefined; this.state = idle(); }
  start(config: SectionConfig) {
    if (this.running) return;
    const controller = new AbortController(); this.controller = controller;
    this.state = { ...idle(), status: 'loading' }; this.deps.changed();
    void this.run(config, controller);
  }
  private async run(config: SectionConfig, controller: AbortController) {
    const signal = controller.signal;
    const current = () => this.controller === controller && !signal.aborted;
    try {
      const list = await this.deps.list(config, signal, count => { if (current()) { this.state.total = count; this.deps.changed(); } });
      if (!current()) return;
      this.state = { status: 'running', total: list.urls.length + list.unsupported, processed: list.unsupported, unsupported: list.unsupported }; this.deps.changed();
      let index = 0;
      const worker = async () => {
        while (current() && index < list.urls.length) {
          const url = list.urls[index++];
          const known = this.deps.known(url);
          let result: Result;
          try { result = known && known.status !== 'error' ? known : await this.deps.read(url, signal); }
          catch (error) { if (!current()) return; if (error instanceof Error && /context invalidated/i.test(error.message)) throw error; result = { status: 'error', message: 'Načítanie zlyhalo.' }; }
          if (!current()) return;
          this.state.processed++; this.deps.record(url, result); this.deps.changed();
        }
      };
      await Promise.all([worker(), worker()]);
      if (current()) { this.state.status = 'done'; this.deps.changed(); }
    } catch (error) {
      if (current()) { controller.abort(); this.state = { ...this.state, status: 'error', message: error instanceof Error ? error.message : 'Kontrola zlyhala.' }; this.deps.changed(); }
    }
  }
}
export function sectionText(state: SectionProgress | undefined): string {
  if (!state || state.status === 'idle') return '';
  const count = `${state.processed} / ${state.total ?? '…'}`;
  if (state.status === 'loading') return `Načítavam zoznam sekcie${state.total === null ? '…' : `: ${state.total} fotiek…`}`;
  if (state.status === 'running') return `Kontrolujem sekciu: ${count}`;
  if (state.status === 'stopped') return `Zastavené: ${count}. Doterajšie výsledky zostali uložené.`;
  if (state.status === 'error') return state.message ?? 'Kontrola sekcie zlyhala.';
  return `Kontrola sekcie dokončená: ${count}${state.unsupported ? ` · nepodporované: ${state.unsupported}` : ''}.`;
}
