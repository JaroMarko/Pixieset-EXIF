import { DEFAULTS, FIELD_NAMES, settingsFrom, displayValue, type Field, type Settings } from './settings';
import type { Summary, Group } from './stats';
import { sectionText } from './section';
const sectionButton = document.querySelector<HTMLButtonElement>('#section-scan')!;
sectionButton.addEventListener('click', async () => {
  sectionButton.disabled = true;
  try {
    const id = sourceTab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (id === undefined) throw new Error('No tab');
    await chrome.tabs.sendMessage(id, { type: 'section' });
  } catch { text('section-status', 'Otvorte galériu a obnovte jej stránku.'); }
  finally { void refresh(); }
});
const sourceParam = new URLSearchParams(location.search).get('tab');
const sourceTab = sourceParam && /^[1-9]\d*$/.test(sourceParam) && Number.isSafeInteger(Number(sourceParam)) ? Number(sourceParam) : undefined;
const popout = document.querySelector<HTMLButtonElement>('#popout')!;
if (sourceTab !== undefined) { document.body.classList.add('detached'); popout.hidden = true; }
popout.addEventListener('click', async () => {
  popout.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No tab');
    await chrome.windows.create({ url: `${chrome.runtime.getURL('popup.html')}?tab=${tab.id}`, type: 'popup', width: 420, height: 800 });
  } catch { status.textContent = 'Samostatné okno sa nepodarilo otvoriť.'; }
  finally { popout.disabled = false; }
});
document.querySelector('#panel')!.addEventListener('click', async () => {
  try {
    const id = sourceTab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (id === undefined) throw new Error('No tab');
    const result = await chrome.tabs.sendMessage(id, { type: 'panel' });
    status.textContent = !result.enabled ? 'Najprv zapnite zobrazovanie údajov.' : result.visible ? 'Panel v galérii je zobrazený.' : 'Panel v galérii je skrytý.';
  } catch { status.textContent = 'Otvorte galériu a obnovte jej stránku.'; }
});
let settings: Settings = structuredClone(DEFAULTS);
const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const status = document.querySelector<HTMLElement>('#status')!;
const font = document.querySelector<HTMLInputElement>('#font')!;
const opacity = document.querySelector<HTMLInputElement>('#opacity')!;
const mode = document.querySelector<HTMLSelectElement>('#mode')!;
const fields = document.querySelector<HTMLElement>('#fields')!;
const text = (id: string, value: string) => { document.getElementById(id)!.textContent = value; };
for (const [key, label] of Object.entries(FIELD_NAMES)) {
  const row = document.createElement('label'), checkbox = document.createElement('input');
  checkbox.type = 'checkbox'; checkbox.dataset.field = key; row.append(checkbox, document.createTextNode(label)); fields.append(row);
}
const controls = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('#controls input,#controls select,#controls button');
function renderControls() {
  enabled.checked = settings.enabled; font.value = String(settings.fontSize); opacity.value = String(settings.opacity); mode.value = settings.mode;
  text('font-value', `${settings.fontSize} px`); text('opacity-value', `${settings.opacity} %`);
  for (const checkbox of fields.querySelectorAll<HTMLInputElement>('input')) checkbox.checked = settings.fields[checkbox.dataset.field as Field];
}
let saving = false;
async function save() {
  if (saving) return;
  saving = true;
  const previous = structuredClone(settings);
  settings = { enabled: enabled.checked, fontSize: Number(font.value), opacity: Number(opacity.value), mode: mode.value === 'hover' ? 'hover' : 'always', fields: Object.fromEntries([...fields.querySelectorAll<HTMLInputElement>('input')].map(input => [input.dataset.field, input.checked])) as Settings['fields'] };
  controls.forEach(control => { control.disabled = true; });
  try { await chrome.storage.local.set({ enabled: settings.enabled, display: displayValue(settings) }); status.textContent = settings.enabled ? 'Zapnuté · nastavenia uložené' : 'Vypnuté · fotky sa nekontrolujú'; }
  catch { settings = previous; status.textContent = 'Uloženie zlyhalo. Skúste to znova.'; }
  finally { saving = false; controls.forEach(control => { control.disabled = false; }); renderControls(); void refresh(); }
}
document.querySelector('#controls')!.addEventListener('change', () => void save());
for (const slider of [font, opacity]) slider.addEventListener('input', () => { text('font-value', `${font.value} px`); text('opacity-value', `${opacity.value} %`); });
document.querySelector('#reset')!.addEventListener('click', () => { const previous = settings; settings = { ...structuredClone(DEFAULTS), enabled: previous.enabled }; renderControls(); settings = previous; void save(); });
function list(id: string, groups: Group[]) {
  const target = document.getElementById(id)!; target.replaceChildren();
  if (!groups.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Údaj zatiaľ nie je dostupný'; target.append(empty); return; }
  for (const group of groups) { const row = document.createElement('div'); row.className = 'group'; const label = document.createElement('span'), count = document.createElement('b'); label.textContent = group.name; count.textContent = String(group.count); row.append(label, count); target.append(row); }
}
let refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const tabId = sourceTab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (tabId === undefined) throw new Error('No tab');
    const summary: Summary = await chrome.tabs.sendMessage(tabId, { type: 'summary' });
    if (!summary || !Number.isFinite(summary.checked)) throw new Error('No summary');
    document.getElementById('summary')!.hidden = false;
    text('gallery', summary.title || 'Aktuálna galéria');
    text('scope', summary.section?.status === 'done' && !summary.section.unsupported ? `Prehľad celej sekcie: ${summary.section.total} fotiek.` : 'Iba fotky skontrolované v tejto karte počas scrollovania alebo kontroly sekcie.');
    const running = summary.section?.status === 'loading' || summary.section?.status === 'running';
    sectionButton.textContent = running ? 'Zastaviť kontrolu' : summary.section?.status === 'stopped' ? 'Pokračovať v kontrole sekcie' : 'Skontrolovať celú sekciu';
    sectionButton.disabled = !summary.enabled || !summary.sectionSupported;
    text('section-status', summary.sectionSupported ? sectionText(summary.section) : 'Kontrola celej sekcie nie je v tomto rozložení dostupná.');
    text('checked', String(summary.checked)); text('available', String(summary.available));
    text('missing', String(summary.missing)); text('errors', String(summary.errors));
    text('detected', `Rozpoznané na stránke: ${summary.detected} · nejde o celkový počet galérie`);
    text('iso', summary.iso ? summary.iso.min === summary.iso.max ? `ISO ${summary.iso.min}` : `ISO ${summary.iso.min}–${summary.iso.max}` : 'ISO zatiaľ chýba');
    text('iso-note', summary.iso ? `Fotky s údajom: ${summary.iso.count}` : '');
    text('flash', summary.flash.known ? `${Math.round(summary.flash.fired / summary.flash.known * 100)} % s bleskom` : 'Blesk zatiaľ neznámy');
    text('flash-note', `Odpálenie: ${summary.flash.fired} · známy údaj: ${summary.flash.known} · bez údaja: ${summary.flash.unknown}`);
    list('cameras', summary.cameras); list('lenses', summary.lenses); list('focals', summary.focals ?? []); list('apertures', summary.apertures);
  } catch {
    sectionButton.disabled = true;
    document.getElementById('summary')!.hidden = true;
    text('gallery', 'Prehľad galérie'); text('scope', 'Otvorte Pixieset galériu. Po aktualizácii rozšírenia obnovte jej stránku.');
  } finally { refreshing = false; }
}
controls.forEach(control => { control.disabled = true; });
void chrome.storage.local.get({ enabled: false, display: {} }).then(input => {
  settings = settingsFrom(input); renderControls(); controls.forEach(control => { control.disabled = false; });
  status.textContent = settings.enabled ? 'Zapnuté · čítanie pri scrollovaní' : 'Vypnuté · fotky sa nekontrolujú';
}).catch(() => { status.textContent = 'Nastavenia sa nepodarilo načítať.'; });
void refresh();
setInterval(() => void refresh(), 2000);
