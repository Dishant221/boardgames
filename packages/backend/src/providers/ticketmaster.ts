import type { Env } from '../types';
import { cachedJson } from '../utils/http';

/**
 * OPTIONAL Ticketmaster Discovery API (free developer key, 5k calls/day).
 * Enabled when TICKETMASTER_API_KEY is set. Without it the events endpoint
 * still returns venue POIs from OpenStreetMap plus deep links.
 */
export interface LiveEvent {
  id: string;
  name: string;
  url: string;
  start: string | null;
  venue: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  image: string | null;
  price_min: number | null;
  currency: string | null;
}

interface TmResponse {
  _embedded?: {
    events?: {
      id: string;
      name: string;
      url: string;
      dates?: { start?: { dateTime?: string; localDate?: string } };
      classifications?: { segment?: { name?: string } }[];
      images?: { url: string; width: number }[];
      priceRanges?: { min?: number; currency?: string }[];
      _embedded?: { venues?: { name?: string; location?: { latitude?: string; longitude?: string } }[] };
    }[];
  };
}

export function ticketmasterEnabled(env: Env): boolean {
  return Boolean(env.TICKETMASTER_API_KEY);
}

export async function liveEvents(env: Env, lat: number, lng: number, radiusKm = 25, keyword?: string, limit = 20): Promise<LiveEvent[]> {
  if (!env.TICKETMASTER_API_KEY) return [];
  const params = new URLSearchParams({
    apikey: env.TICKETMASTER_API_KEY,
    latlong: `${lat.toFixed(3)},${lng.toFixed(3)}`,
    radius: String(Math.min(150, radiusKm)),
    unit: 'km',
    size: String(Math.min(50, limit)),
    sort: 'date,asc'
  });
  if (keyword) params.set('keyword', keyword);
  try {
    const data = await cachedJson<TmResponse>(env, 'ticketmaster', `https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
      ttlSeconds: 3 * 3600
    });
    return (data._embedded?.events ?? []).map((e) => {
      const v = e._embedded?.venues?.[0];
      const img = (e.images ?? []).sort((a, b) => b.width - a.width)[0];
      return {
        id: `tm_${e.id}`,
        name: e.name,
        url: e.url,
        start: e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? null,
        venue: v?.name ?? null,
        lat: v?.location?.latitude ? parseFloat(v.location.latitude) : null,
        lng: v?.location?.longitude ? parseFloat(v.location.longitude) : null,
        category: e.classifications?.[0]?.segment?.name ?? null,
        image: img?.url ?? null,
        price_min: e.priceRanges?.[0]?.min ?? null,
        currency: e.priceRanges?.[0]?.currency ?? null
      };
    });
  } catch {
    return [];
  }
}
