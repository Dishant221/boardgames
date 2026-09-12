import type { Env, Place } from '../types';
import { cachedJson, haversineMeters } from '../utils/http';

/**
 * OpenStreetMap Overpass API - free POI data (restaurants, sights, hotels,
 * pharmacies, ATMs, transit...). Cached for 24h; results are rounded to a
 * coarse grid so users in the same neighbourhood share the cache entry.
 */
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export type PoiCategory =
  | 'sights'
  | 'museums'
  | 'food'
  | 'cafes'
  | 'nightlife'
  | 'hotels'
  | 'transport'
  | 'pharmacy'
  | 'hospital'
  | 'atm'
  | 'supermarket'
  | 'shopping'
  | 'nature'
  | 'events'
  | 'wifi'
  | 'toilets'
  | 'police';

export const POI_CATEGORIES: Record<PoiCategory, { label: string; filters: string[] }> = {
  sights: {
    label: 'Sights & landmarks',
    filters: ['tourism~"attraction|viewpoint|artwork"', 'historic~"monument|castle|ruins|memorial|archaeological_site|church|cathedral|palace"']
  },
  museums: { label: 'Museums & galleries', filters: ['tourism~"museum|gallery"'] },
  food: { label: 'Restaurants', filters: ['amenity~"restaurant|fast_food|food_court"'] },
  cafes: { label: 'Cafés & bakeries', filters: ['amenity~"cafe|ice_cream"', 'shop~"bakery|pastry"'] },
  nightlife: { label: 'Bars & nightlife', filters: ['amenity~"bar|pub|nightclub|biergarten"'] },
  hotels: { label: 'Hotels & stays', filters: ['tourism~"hotel|hostel|guest_house|apartment|motel"'] },
  transport: {
    label: 'Transit',
    filters: ['railway~"station|halt|tram_stop|subway_entrance"', 'amenity~"bus_station|ferry_terminal|taxi|bicycle_rental"', 'public_transport="station"']
  },
  pharmacy: { label: 'Pharmacies', filters: ['amenity="pharmacy"'] },
  hospital: { label: 'Hospitals & clinics', filters: ['amenity~"hospital|clinic|doctors"'] },
  atm: { label: 'ATMs & exchange', filters: ['amenity~"atm|bank|bureau_de_change"'] },
  supermarket: { label: 'Groceries', filters: ['shop~"supermarket|convenience|greengrocer"'] },
  shopping: { label: 'Shopping', filters: ['shop~"mall|department_store|clothes|gift|books|jewelry|shoes"'] },
  nature: { label: 'Parks & nature', filters: ['leisure~"park|garden|nature_reserve"', 'natural~"beach|peak|water"'] },
  events: { label: 'Venues', filters: ['amenity~"theatre|cinema|arts_centre|events_venue|concert_hall|music_venue"', 'leisure~"stadium"'] },
  wifi: { label: 'Free Wi-Fi', filters: ['internet_access~"wlan|yes"'] },
  toilets: { label: 'Toilets', filters: ['amenity="toilets"'] },
  police: { label: 'Police', filters: ['amenity="police"'] }
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function nearbyPlaces(
  env: Env,
  lat: number,
  lng: number,
  category: PoiCategory,
  radiusM = 1500,
  limit = 30
): Promise<Place[]> {
  const def = POI_CATEGORIES[category];
  if (!def) return [];
  const r = Math.min(Math.max(200, radiusM), 10000);
  // snap to a ~250m grid for cache sharing
  const gLat = (Math.round(lat * 400) / 400).toFixed(4);
  const gLng = (Math.round(lng * 400) / 400).toFixed(4);
  const union = def.filters.map((f) => `nwr[${f}](around:${r},${gLat},${gLng});`).join('\n');
  const query = `[out:json][timeout:20];(\n${union}\n);out center tags ${Math.min(limit * 3, 200)};`;

  let elements: OverpassElement[] = [];
  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const data = await cachedJson<{ elements: OverpassElement[] }>(env, 'overpass', endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        ttlSeconds: 86400,
        timeoutMs: 25000
      });
      elements = data.elements ?? [];
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;

  const places: Place[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name || tags['name:en'];
    if (!name) continue;
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (pLat === undefined || pLng === undefined) continue;
    places.push({
      id: `osm_${el.type}_${el.id}`,
      name,
      category,
      lat: pLat,
      lng: pLng,
      address: formatAddress(tags),
      source: 'osm',
      source_id: `${el.type}/${el.id}`,
      tags: pickTags(tags),
      distance_m: Math.round(haversineMeters(lat, lng, pLat, pLng)),
      website: tags.website || tags['contact:website'],
      opening_hours: tags.opening_hours,
      phone: tags.phone || tags['contact:phone']
    });
  }
  places.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  // de-duplicate by name+rounded coords
  const seen = new Set<string>();
  return places
    .filter((p) => {
      const k = `${p.name}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

function formatAddress(t: Record<string, string>): string | undefined {
  const parts = [
    [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '),
    t['addr:postcode'],
    t['addr:city']
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function pickTags(t: Record<string, string>): Record<string, string> {
  const keep = ['cuisine', 'tourism', 'historic', 'amenity', 'shop', 'leisure', 'wheelchair', 'wikipedia', 'wikidata', 'stars', 'fee', 'internet_access', 'outdoor_seating', 'takeaway', 'diet:vegetarian', 'diet:vegan'];
  const out: Record<string, string> = {};
  for (const k of keep) if (t[k]) out[k] = t[k];
  return out;
}
