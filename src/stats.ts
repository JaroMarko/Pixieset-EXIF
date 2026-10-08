import type { SectionProgress } from './section';
import type { Result } from './model';
export type Group = { name: string; count: number };
export type Summary = { checked: number; available: number; missing: number; errors: number; cameras: Group[]; lenses: Group[]; apertures: Group[]; focals: Group[]; section?: SectionProgress; sectionSupported?: boolean; iso: { min: number; max: number; count: number } | null; flash: { fired: number; known: number; unknown: number }; detected: number; title: string; enabled: boolean };
export function photoKey(url: string): string {
  const u = new URL(url);
  return u.origin + u.pathname.replace(/-(?:thumb|small|medium|large|xlarge|xxlarge|cover|cover-large)\.jpe?g$/i, '.jpg');
}
export function summarize(results: ReadonlyMap<string, Result>): Omit<Summary, 'detected' | 'title' | 'enabled' | 'section' | 'sectionSupported'> {
  let available = 0, missing = 0, errors = 0, known = 0, fired = 0, unknown = 0;
  const cameras = new Map<string, number>(), lenses = new Map<string, number>(), apertures = new Map<string, number>(), focals = new Map<string, number>();
  const isos: number[] = [];
  const add = (map: Map<string, number>, value: string | undefined) => { if (value) map.set(value, (map.get(value) ?? 0) + 1); };
  for (const result of results.values()) {
    if (result.status === 'missing') { missing++; unknown++; continue; }
    if (result.status === 'error') { errors++; continue; }
    available++;
    const data = result.data;
    add(cameras, data.camera); add(lenses, data.lens);
    if (data.focal && data.focal > 0) add(focals, `${Number(data.focal.toFixed(1))} mm`);
    if (data.aperture && data.aperture > 0) add(apertures, `f/${Number(data.aperture.toFixed(1))}`);
    if (data.iso && data.iso > 0) isos.push(data.iso);
    if (data.flash === undefined) unknown++;
    else { known++; if ((data.flash & 1) && !(data.flash & 32)) fired++; }
  }
  const groups = (map: Map<string, number>) => [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { checked: results.size, available, missing, errors, cameras: groups(cameras), lenses: groups(lenses), apertures: groups(apertures), focals: groups(focals), iso: isos.length ? { min: Math.min(...isos), max: Math.max(...isos), count: isos.length } : null, flash: { known, fired, unknown } };
}
