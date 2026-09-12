import type { Env, GeoPoint } from '../types';
import { cachedJson } from '../utils/http';

/**
 * OSRM public demo server - free routing for walking / cycling / driving.
 * (Demo server is rate-limited and not for heavy production use; swap BASE for
 * a self-hosted OSRM or Cloudflare-fronted instance when traffic grows.)
 */
const BASE = 'https://router.project-osrm.org';

export type TravelMode = 'foot' | 'bike' | 'car';

export interface RouteResult {
  mode: TravelMode;
  distance_m: number;
  duration_s: number;
  geometry: GeoPoint[]; // decoded polyline
  steps: { instruction: string; distance_m: number; duration_s: number; name: string }[];
}

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: string;
    legs: {
      steps: {
        distance: number;
        duration: number;
        name: string;
        maneuver: { type: string; modifier?: string };
      }[];
    }[];
  }[];
}

export async function route(env: Env, from: GeoPoint, to: GeoPoint, mode: TravelMode = 'foot'): Promise<RouteResult | null> {
  const profile = mode === 'car' ? 'driving' : mode === 'bike' ? 'cycling' : 'walking';
  const coords = `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
  const url = `${BASE}/route/v1/${profile}/${coords}?overview=simplified&steps=true&geometries=polyline`;
  const data = await cachedJson<OsrmResponse>(env, 'osrm', url, { ttlSeconds: 6 * 3600 });
  const r = data.routes?.[0];
  if (data.code !== 'Ok' || !r) return null;
  return {
    mode,
    distance_m: Math.round(r.distance),
    duration_s: Math.round(r.duration),
    geometry: decodePolyline(r.geometry),
    steps: r.legs.flatMap((leg) =>
      leg.steps.map((s) => ({
        instruction: describe(s.maneuver.type, s.maneuver.modifier, s.name),
        distance_m: Math.round(s.distance),
        duration_s: Math.round(s.duration),
        name: s.name
      }))
    )
  };
}

function describe(type: string, modifier: string | undefined, name: string): string {
  const onto = name ? ` onto ${name}` : '';
  switch (type) {
    case 'depart':
      return `Head ${modifier ?? 'out'}${onto}`;
    case 'arrive':
      return 'Arrive at your destination';
    case 'turn':
      return `Turn ${modifier ?? ''}${onto}`.replace(/\s+/g, ' ');
    case 'continue':
    case 'new name':
      return `Continue${onto}`;
    case 'roundabout':
    case 'rotary':
      return `Take the roundabout${onto}`;
    case 'fork':
      return `Keep ${modifier ?? 'straight'}${onto}`;
    case 'merge':
      return `Merge ${modifier ?? ''}${onto}`.replace(/\s+/g, ' ');
    case 'end of road':
      return `At the end of the road turn ${modifier ?? ''}${onto}`.replace(/\s+/g, ' ');
    default:
      return `${type}${onto}`;
  }
}

export function decodePolyline(str: string, precision = 5): GeoPoint[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: GeoPoint[] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let byte = 0;
    let shift = 0;
    let result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;
    lng += dLng;
    coordinates.push({ lat: lat / factor, lng: lng / factor });
  }
  return coordinates;
}
