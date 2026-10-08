import type { Summary, Group } from './stats';
import { sectionText } from './section';
// All controls live in a shadow root, isolated from gallery styles.
export function createPanel(onSection: () => void = () => {}) {
  const host = document.createElement('pixieset-exif-panel');
  host.style.cssText = 'all:initial;position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:2147483646;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `:host{all:initial}*{box-sizing:border-box}.shell{display:flex;align-items:center;color:#eef5f0;font:12px/1.45 system-ui,sans-serif;filter:drop-shadow(0 5px 15px #0003)}button{font:inherit;color:inherit;cursor:pointer;border:0}button:focus-visible{outline:2px solid #6de2c4;outline-offset:-3px}.rail{width:54px;padding:10px 0;background:#162b27f2;border:1px solid #ffffff20;border-radius:12px;display:grid;gap:10px;flex-shrink:0}.metric{display:grid;justify-items:center;gap:2px}.metric svg{width:18px;height:18px;fill:none;stroke:#a4cfc1;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.metric b{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}.detail{width:min(300px,calc(100vw - 90px));max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;background:#f4f5ef;color:#21312e;padding:17px;border:1px solid #dfe6e1;border-radius:12px 0 0 12px}.shell.open .rail{border-radius:0 12px 12px 0}.head{display:flex;align-items:center;gap:8px;justify-content:space-between}.head b{font-size:14px}.head button{background:#e5ede5;color:#22746b;padding:6px 9px;font-size:12px;border-radius:5px;white-space:nowrap}p{margin:7px 0;color:#62736d;font-size:11px}h3{font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 5px;color:#62736d}.row{display:flex;justify-content:space-between;gap:14px;padding:5px 0;border-bottom:1px solid #dfe6e1}.row span{overflow-wrap:anywhere}.row b{color:#22746b;flex-shrink:0}.scan{width:100%;padding:8px;border-radius:5px;background:#22746b;color:white;margin-top:8px}.scan:disabled{opacity:.5;cursor:default}progress{width:100%;height:5px;accent-color:#22746b}.facts{border-top:1px solid #dfe6e1;margin-top:14px;padding-top:7px}.facts b{font-size:12px}[hidden]{display:none!important}@media(prefers-reduced-motion:no-preference){.detail{animation:reveal .15s ease-out}@keyframes reveal{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}}`;
  const shell = document.createElement('div'); shell.className = 'shell';
  const detail = document.createElement('section'); detail.className = 'detail'; detail.hidden = true; detail.setAttribute('aria-label', 'Štatistiky Pixieset EXIF');
  const head = document.createElement('div'); head.className = 'head';
  const heading = document.createElement('b'); heading.textContent = 'Pixieset EXIF';
  const collapse = document.createElement('button'); collapse.textContent = 'Zbaliť ›'; collapse.title = 'Zbaliť prehľad'; collapse.setAttribute('aria-label', collapse.title);
  head.append(heading, collapse);
  const scope = document.createElement('p');
  const task = document.createElement('button'); task.className = 'scan'; task.textContent = 'Skontrolovať celú sekciu'; task.addEventListener('click', onSection);
  const progress = document.createElement('progress'); progress.hidden = true;
  const taskNote = document.createElement('p'); taskNote.setAttribute('role', 'status');
  const body = document.createElement('div'); detail.append(head, scope, task, taskNote, progress, body);
  const rail = document.createElement('button'); rail.className = 'rail'; rail.title = 'Rozbaliť prehľad'; rail.setAttribute('aria-label', rail.title); rail.setAttribute('aria-expanded', 'false');
  const paths = [
    '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m4 16 5-5 4 4 3-3 4 4"/><circle cx="15" cy="8" r="1"/>',
    '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v4m9 5h-4m-5 9v-4m-9-5h4"/>',
    '<path d="m14 2-9 12h7l-2 8 9-12h-7z"/>'
  ];
  const values = paths.map(path => { const item = document.createElement('span'); item.className = 'metric'; const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('aria-hidden','true'); icon.innerHTML = path; const value = document.createElement('b'); value.textContent = '0'; item.append(icon, value); rail.append(item); return { item, value }; });
  shell.append(detail, rail); root.append(style, shell);
  let dismissed = false, active = false;
  function expand(open: boolean) { detail.hidden = !open; shell.classList.toggle('open', open); rail.setAttribute('aria-expanded', String(open)); rail.title = open ? 'Zbaliť prehľad' : 'Rozbaliť prehľad'; rail.setAttribute('aria-label', rail.title); }
  rail.addEventListener('click', () => expand(detail.hidden));
  collapse.addEventListener('click', () => { expand(false); rail.focus(); });
  const outside = (event: Event) => { if (!event.composedPath().includes(host)) expand(false); };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !detail.hidden) { const focused = root.activeElement !== null; expand(false); if (focused) rail.focus(); } };
  document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
  const group = (title: string, groups: Group[]) => { const h = document.createElement('h3'); h.textContent = title; body.append(h); if (!groups.length) { const p = document.createElement('p'); p.textContent = 'Údaj zatiaľ chýba'; body.append(p); } for (const entry of groups) { const row = document.createElement('div'); row.className = 'row'; const name = document.createElement('span'), count = document.createElement('b'); name.textContent = entry.name; count.textContent = String(entry.count); row.append(name, count); body.append(row); } };
  return {
    update(summary: Summary) {
      active = summary.enabled;
      if (!host.isConnected) document.documentElement.append(host);
      host.style.display = active && !dismissed ? 'block' : 'none';
      const flash = summary.flash.known ? `${Math.round(summary.flash.fired / summary.flash.known * 100)}%` : '—';
      const counts = [String(summary.checked), String(summary.cameras.length), String(summary.lenses.length), flash];
      const labels = ['Skontrolované fotky', 'Počet rôznych tiel', 'Počet rôznych objektívov', 'Podiel odpáleného blesku zo známych údajov'];
      values.forEach(({ item, value }, index) => { value.textContent = counts[index]; item.title = `${labels[index]}: ${counts[index]}`; });
      rail.setAttribute('aria-label', `${rail.title}. ${labels.map((label, i) => `${label}: ${counts[i]}`).join('. ')}`);
      const state = summary.section;
      const running = state?.status === 'loading' || state?.status === 'running';
      task.textContent = running ? 'Zastaviť kontrolu' : state?.status === 'stopped' ? 'Pokračovať v kontrole sekcie' : 'Skontrolovať celú sekciu';
      task.disabled = !summary.enabled || !summary.sectionSupported;
      taskNote.textContent = summary.sectionSupported ? sectionText(state) : 'Kontrola celej sekcie nie je v tomto rozložení dostupná.';
      progress.hidden = !running;
      if (state?.status === 'running' && state.total !== null && state.total > 0) { progress.max = state.total; progress.value = state.processed; } else progress.removeAttribute('value');
      scope.textContent = state?.status === 'done' && !state.unsupported ? `Prehľad celej sekcie: ${state.total} fotiek. Údaje sú dostupné pri ${summary.available} fotkách.` : `Z doteraz skontrolovaných ${summary.checked} fotiek. Prehľad sa dopĺňa pri scrollovaní.`;
      body.replaceChildren(); group('Fotoaparáty', summary.cameras); group('Objektívy', summary.lenses); group('Ohniská', summary.focals ?? []); group('Použité clony', summary.apertures);
      const facts = document.createElement('div'); facts.className = 'facts';
      const iso = document.createElement('b'); iso.textContent = summary.iso ? `ISO ${summary.iso.min}${summary.iso.max !== summary.iso.min ? `–${summary.iso.max}` : ''}` : 'ISO zatiaľ chýba';
      const note = document.createElement('p'); note.textContent = `S EXIF: ${summary.available} · bez údajov: ${summary.missing} · chyby: ${summary.errors}`;
      const flashNote = document.createElement('p'); flashNote.textContent = `Blesk: ${flash} · odpálenie ${summary.flash.fired} / ${summary.flash.known} so známym údajom · bez údaja ${summary.flash.unknown}`;
      facts.append(iso, note, flashNote); body.append(facts);
    },
    toggle() { dismissed = !dismissed; host.style.display = active && !dismissed ? 'block' : 'none'; if (dismissed) expand(false); return !dismissed; },
    destroy() { host.remove(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); }
  };
}
