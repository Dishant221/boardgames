import type { Env, Place } from '../types';
import { haversineMeters } from '../utils/http';

/**
 * OPTIONAL Google Places API (New). Only used when GOOGLE_MAPS_API_KEY is set as
 * a Worker secret. Everything in the app works without it via OpenStreetMap;
 * Google adds ratings and better coverage of commercial venues. Responses are
 * NOT cached beyond the request (Google's terms restrict caching of Places data).
 *
 * Deep links to Google Maps (see intents.ts) never need a key.
 */
const TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  primaryType?: string;
  currentOpeningHours?: { weekdayDescriptions?: string[] };
}

export function googleEnabled(env: Env): boolean {
  return Boolean(env.GOOGLE_MAPS_API_KEY);
}

export async function googleTextSearch(
  env: Env,
  query: string,
  near: { lat: number; lng: number },
  radiusM = 2000,
  limit = 10
): Promise<Place[]> {
  if (!env.GOOGLE_MAPS_API_KEY) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(TEXT_SEARCH, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.websiteUri,places.nationalPhoneNumber,places.primaryType,places.currentOpeningHours.weekdayDescriptions'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: Math.min(20, limit),
        locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: Math.min(50000, radiusM) } }
      })
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { places?: GooglePlace[] };
    return (data.places ?? [])
      .filter((p) => p.location && p.displayName)
      .map((p) => ({
        id: `google_${p.id}`,
        name: p.displayName!.text,
        category: p.primaryType ?? 'place',
        lat: p.location!.latitude,
        lng: p.location!.longitude,
        address: p.formattedAddress,
        source: 'google' as const,
        source_id: p.id,
        rating: p.rating,
        website: p.websiteUri,
        phone: p.nationalPhoneNumber,
        opening_hours: p.currentOpeningHours?.weekdayDescriptions?.join('; '),
        distance_m: Math.round(haversineMeters(near.lat, near.lng, p.location!.latitude, p.location!.longitude))
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
