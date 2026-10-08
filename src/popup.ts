import { DEFAULTS, FIELD_NAMES, settingsFrom, displayValue, type Field, type Settings } from './settings';
import type { Summary, Group } from './stats';
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
const controls = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button');
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No tab');
    const summary: Summary = await chrome.tabs.sendMessage(tab.id, { type: 'summary' });
    if (!summary || !Number.isFinite(summary.checked)) throw new Error('No summary');
    document.getElementById('summary')!.hidden = false;
    text('gallery', summary.title || 'Aktuálna galéria');
    text('scope', 'Iba fotky skontrolované v tejto karte počas scrollovania.');
    text('checked', String(summary.checked)); text('available', String(summary.available));
    text('missing', String(summary.missing)); text('errors', String(summary.errors));
    text('detected', `Rozpoznané na stránke: ${summary.detected} · nejde o celkový počet galérie`);
    text('iso', summary.iso ? summary.iso.min === summary.iso.max ? `ISO ${summary.iso.min}` : `ISO ${summary.iso.min}–${summary.iso.max}` : 'ISO zatiaľ chýba');
    text('iso-note', summary.iso ? `Fotky s údajom: ${summary.iso.count}` : '');
    text('flash', summary.flash.known ? `${Math.round(summary.flash.fired / summary.flash.known * 100)} % s bleskom` : 'Blesk zatiaľ neznámy');
    text('flash-note', `Odpálenie: ${summary.flash.fired} · známy údaj: ${summary.flash.known} · bez údaja: ${summary.flash.unknown}`);
    list('cameras', summary.cameras); list('lenses', summary.lenses); list('apertures', summary.apertures);
  } catch {
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
