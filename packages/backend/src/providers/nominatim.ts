import type { Env, GeocodeResult } from '../types';
import { cachedJson } from '../utils/http';

/**
 * OpenStreetMap Nominatim - free geocoding (forward + reverse).
 * Usage policy: max 1 req/s, identifying User-Agent, cache results. We cache
 * for 7 days because place coordinates essentially never change.
 */
const BASE = 'https://nominatim.openstreetmap.org';

interface NominatimRow {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type: string;
  class: string;
  boundingbox?: [string, string, string, string];
  address?: Record<string, string>;
}

export async function geocode(env: Env, query: string, limit = 5): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const rows = await cachedJson<NominatimRow[]>(env, 'nominatim', url, { ttlSeconds: 7 * 86400 });
  return rows.map(toResult);
}

export async function reverseGeocode(env: Env, lat: number, lng: number): Promise<GeocodeResult | null> {
  // Round to ~100m so nearby lookups share a cache entry.
  const la = lat.toFixed(3);
  const lo = lng.toFixed(3);
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${la}&lon=${lo}`;
  try {
    const row = await cachedJson<NominatimRow & { error?: string }>(env, 'nominatim', url, {
      ttlSeconds: 7 * 86400
    });
    if (row.error) return null;
    return toResult(row);
  } catch {
    return null;
  }
}

function toResult(row: NominatimRow): GeocodeResult {
  const a = row.address ?? {};
  const name =
    row.name ||
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.state ||
    row.display_name.split(',')[0];
  const bb = row.boundingbox?.map(Number) as [number, number, number, number] | undefined;
  return {
    name,
    display_name: row.display_name,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lon),
    type: row.type,
    country_code: a.country_code?.toUpperCase(),
    bounding_box: bb
  };
}

export function cityLabel(r: GeocodeResult): string {
  const parts = r.display_name.split(',').map((s) => s.trim());
  const country = parts[parts.length - 1];
  return country && country !== r.name ? `${r.name}, ${country}` : r.name;
}
