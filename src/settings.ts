export const FIELD_NAMES = { focal: 'Ohnisko', aperture: 'Clona', exposure: 'Čas', iso: 'ISO', flash: 'Blesk', camera: 'Fotoaparát', lens: 'Objektív' } as const;
export type Field = keyof typeof FIELD_NAMES;
export type Settings = { enabled: boolean; fontSize: number; opacity: number; mode: 'always' | 'hover'; fields: Record<Field, boolean> };
export const DEFAULTS: Settings = { enabled: false, fontSize: 12, opacity: 84, mode: 'always', fields: { focal: true, aperture: true, exposure: true, iso: true, flash: true, camera: true, lens: true } };
export function settingsFrom(input: Record<string, unknown>): Settings {
  const display = input.display && typeof input.display === 'object' ? input.display as Record<string, unknown> : {};
  const fields = display.fields && typeof display.fields === 'object' ? display.fields as Record<string, unknown> : {};
  const bounded = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value))) : fallback;
  return { enabled: input.enabled === true, mode: display.mode === 'hover' ? 'hover' : 'always', fontSize: bounded(display.fontSize, 10, 16, DEFAULTS.fontSize), opacity: bounded(display.opacity, 35, 95, DEFAULTS.opacity), fields: Object.fromEntries(Object.keys(FIELD_NAMES).map(key => [key, typeof fields[key] === 'boolean' ? fields[key] : true])) as Record<Field, boolean> };
}
export function displayValue(settings: Settings) { return { fontSize: settings.fontSize, opacity: settings.opacity, mode: settings.mode, fields: settings.fields }; }
