// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { sectionConfig, listSection, SectionScan } from '../src/section';
import type { Result } from '../src/model';
const config = { origin: 'https://demo.pixieset.com', collection: 'wedding-day', id: '123', slug: 'party' };
const url = (n: number) => `https://images.pixieset.com/1/p${n}-medium.jpg`;
const page = (ids: number[], last: boolean) => ({ ok: true, json: async () => ({ status: 'success', content: JSON.stringify(ids.map(id => ({ id, pathMedium: url(id) }))), isLastPage: last }) });
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
afterEach(() => vi.unstubAllGlobals());
test('configuration is scoped to the collection and section without executing script', () => {
  document.body.innerHTML = `<script>PixiesetClient.init({'collectionId':123,'collectionUrlKey':'wedding\\x2Dday','currentGallery':'party','favKey': null,'clientDownloads':false});</script>`;
  expect(sectionConfig(document, 'https://demo.pixieset.com/wedding-day/party/')).toEqual(config);
  expect(sectionConfig(document, 'https://demo.pixieset.com/other/party/')).toBeUndefined();
  expect(sectionConfig(document, 'https://demo.pixieset.com/wedding-day/')).toBeUndefined();
  document.body.innerHTML = `<script>PixiesetClient.init({'collectionId':123,'collectionUrlKey':'wedding-day','favKey':'secret'});</script>`;
  expect(sectionConfig(document, 'https://demo.pixieset.com/wedding-day/party/')).toBeUndefined();
});
test('pagination follows explicit last page, restricts hosts and removes duplicates', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(page([1, 2], false)).mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'success', content: JSON.stringify([{ id: 2, pathMedium: url(2) }, { id: 3, pathMedium: '//images.pixieset.com/1/p3-medium.jpg' }, { id: 4, pathMedium: 'https://evil.example/a.jpg' }]), isLastPage: true }) });
  vi.stubGlobal('fetch', fetch);
  const result = await listSection(config, new AbortController().signal, vi.fn());
  expect(result).toEqual({ urls: [url(1), url(2), url(3)], unsupported: 1 });
  expect(fetch.mock.calls[1][0].searchParams.get('page')).toBe('2');
  expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'same-origin',headers:{'X-Requested-With':'XMLHttpRequest'}});
});
test('a repeated page or missing end marker is not reported as complete', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(page([1], false)));
  await expect(listSection(config, new AbortController().signal, vi.fn())).rejects.toThrow('opakuje');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'success',content:'[]'})}));
  await expect(listSection(config, new AbortController().signal, vi.fn())).rejects.toThrow('potvrdený');
});
test('scanner reads at most two photos concurrently and reuses known results', async () => {
  let active = 0, max = 0;
  const record = vi.fn();
  const read = vi.fn(async (): Promise<Result> => { active++; max=Math.max(max,active); await tick(); active--; return {status:'ok',data:{focal:35}}; });
  const scan = new SectionScan({ list: async () => ({urls:[url(1),url(2),url(3),url(4)],unsupported:0}), known: u => u===url(1)?{status:'missing'}:undefined, read, record, changed: vi.fn() });
  scan.start(config); await tick(); await tick(); await tick(); await tick();
  expect(scan.state).toMatchObject({status:'done',total:4,processed:4});
  expect(read).toHaveBeenCalledTimes(3); expect(max).toBe(2); expect(record).toHaveBeenCalledTimes(4);
});
test('stopping or changing section ignores outstanding results', async () => {
  let finish!: (r: Result) => void;
  const record = vi.fn();
  const scan = new SectionScan({list:async()=>({urls:[url(1)],unsupported:0}),known:()=>undefined,read:()=>new Promise(resolve=>{finish=resolve;}),record,changed:vi.fn()});
  scan.start(config); await tick(); scan.stop(); finish({status:'ok',data:{focal:85}}); await tick();
  expect(scan.state.status).toBe('stopped'); expect(record).not.toHaveBeenCalled();
  scan.start(config); await tick(); scan.reset(); finish({status:'missing'}); await tick();
  expect(scan.state.status).toBe('idle'); expect(record).not.toHaveBeenCalled();
});
test('list failures remain incomplete and expose a useful message', async () => {
  const scan = new SectionScan({list:async()=>{throw new Error('Session expired');},known:()=>undefined,read:vi.fn(),record:vi.fn(),changed:vi.fn()});
  scan.start(config); await tick(); expect(scan.state).toMatchObject({status:'error',message:'Session expired'});
});
