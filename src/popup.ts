export {};
const checkbox = document.querySelector<HTMLInputElement>('#enabled')!;
const status = document.querySelector<HTMLElement>('#status')!;
checkbox.disabled = true;
chrome.storage.local.get({ enabled: false }).then(settings => {
  checkbox.checked = settings.enabled === true; checkbox.disabled = false;
  status.textContent = checkbox.checked ? 'Zapnuté. Údaje sa načítajú pri scrollovaní.' : 'Vypnuté. Fotky sa nekontrolujú.';
}).catch(() => { status.textContent = 'Nastavenie sa nepodarilo načítať.'; });
checkbox.addEventListener('change', async () => {
  checkbox.disabled = true;
  try { await chrome.storage.local.set({ enabled: checkbox.checked }); status.textContent = checkbox.checked ? 'Zapnuté. Údaje sa načítajú pri scrollovaní.' : 'Vypnuté. Fotky sa nekontrolujú.'; }
  catch { checkbox.checked = !checkbox.checked; status.textContent = 'Nastavenie sa nepodarilo uložiť.'; }
  finally { checkbox.disabled = false; }
});
