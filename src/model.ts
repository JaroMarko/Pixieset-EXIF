export type Metadata = { focal?: number; iso?: number; exposure?: number; aperture?: number; flash?: number; camera?: string; lens?: string };
export type Result = { status: 'ok'; data: Metadata } | { status: 'missing' } | { status: 'error'; message: string };
export const TAGS = ['FocalLength', 'ISO', 'ISOSpeedRatings', 'ExposureTime', 'FNumber', 'Flash', 'Model', 'LensModel'];
export function normalize(tags: Record<string, unknown> | undefined): Metadata {
  const number = (key: string) => typeof tags?.[key] === 'number' && Number.isFinite(tags[key]) ? tags[key] as number : undefined;
  const string = (key: string) => typeof tags?.[key] === 'string' ? (tags[key] as string).trim().slice(0, 120) : undefined;
  return { focal: number('FocalLength'), iso: number('ISO') ?? number('ISOSpeedRatings'), exposure: number('ExposureTime'), aperture: number('FNumber'), flash: number('Flash'), camera: string('Model'), lens: string('LensModel') };
}
export function hasMetadata(data: Metadata): boolean { return Object.values(data).some(value => value !== undefined && value !== ''); }
export function flashLabel(value: number | undefined): string {
  if (value === undefined) return 'Blesk: údaj chýba';
  if (value & 32) return 'Blesk: bez funkcie blesku';
  const mode = (value >> 3) & 3;
  const suffix = mode === 1 ? 'vynútený režim' : mode === 2 ? 'potlačený režim' : mode === 3 ? 'automatický režim' : '';
  return `Blesk: ${value & 1 ? 'áno' : 'nie'}${suffix ? ` · ${suffix}` : ''}${value & 64 ? ' · redukcia červených očí' : ''}`;
}
export function exposureLabel(value: number): string { return value < 1 ? `1/${Math.round(1 / value)} s` : `${Number(value.toFixed(2))} s`; }
export function lines(data: Metadata): string[] {
  const settings = [data.focal && `${Number(data.focal.toFixed(1))} mm`, data.aperture && `f/${Number(data.aperture.toFixed(1))}`, data.exposure && exposureLabel(data.exposure), data.iso && `ISO ${data.iso}`].filter(Boolean).join(' · ');
  return [settings, data.camera, flashLabel(data.flash)].filter((value): value is string => Boolean(value));
}
