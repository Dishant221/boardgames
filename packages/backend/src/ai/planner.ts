import type { Env, Place, StopKind, TripWithDays, UserPreferences } from '../types';
import { generate, extractJson } from './provider';
import { nearbyPlaces } from '../providers/overpass';
import { forecast } from '../providers/openmeteo';

/**
 * Itinerary auto-planner. Fetches real POIs for the destination, asks the LLM
 * to arrange them into days, validates the result against the fetched set (so
 * the model cannot hallucinate places), and falls back to a deterministic
 * nearest-neighbour plan when the model output is unusable.
 */
export interface PlannedStop {
  kind: StopKind;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  source: string | null;
}

export interface PlannedDay {
  day_index: number;
  title: string;
  notes: string | null;
  stops: PlannedStop[];
}

export interface PlanResult {
  days: PlannedDay[];
  provider: string;
  neurons: number;
  externalCalls: number;
}

export async function planTrip(env: Env, trip: TripWithDays, prefs: UserPreferences): Promise<PlanResult> {
  if (trip.dest_lat === null || trip.dest_lng === null) {
    throw new Error('Trip has no destination coordinates');
  }
  const dayCount = Math.max(1, Math.min(10, countDays(trip.start_date, trip.end_date) || trip.days.length || 3));
  const lat = trip.dest_lat;
  const lng = trip.dest_lng;
  let externalCalls = 0;

  const wantFood = true;
  const [sights, museums, food, cafes, nature, weather] = await Promise.all([
    nearbyPlaces(env, lat, lng, 'sights', 4000, 24).catch(() => [] as Place[]),
    nearbyPlaces(env, lat, lng, 'museums', 4000, 12).catch(() => [] as Place[]),
    wantFood ? nearbyPlaces(env, lat, lng, 'food', 2500, 16).catch(() => [] as Place[]) : Promise.resolve([] as Place[]),
    nearbyPlaces(env, lat, lng, 'cafes', 2500, 8).catch(() => [] as Place[]),
    nearbyPlaces(env, lat, lng, 'nature', 5000, 8).catch(() => [] as Place[]),
    forecast(env, lat, lng, Math.min(16, dayCount + 1)).catch(() => null)
  ]);
  externalCalls += 6;

  const pool = [...sights, ...museums, ...nature, ...food, ...cafes];
  const byName = new Map(pool.map((p) => [normalize(p.name), p]));

  const menu = pool
    .map((p) => `${p.name} | ${p.category} | ${p.distance_m ?? '?'} m from centre${p.tags?.cuisine ? ` | ${p.tags.cuisine}` : ''}${p.opening_hours ? ` | ${p.opening_hours}` : ''}`)
    .join('\n');
  const weatherLine = weather
    ? weather.daily
        .slice(0, dayCount)
        .map((d, i) => `Day ${i + 1} (${d.date}): ${d.description}, ${Math.round(d.t_min_c)}–${Math.round(d.t_max_c)}°C, rain ${d.precipitation_probability}%`)
        .join('\n')
    : 'unknown';

  const system = `You are an expert travel planner. Build a realistic ${dayCount}-day itinerary for ${trip.destination}. Use ONLY places from the PLACES list (copy names exactly). Group geographically close places on the same day, put museums on rainy days, add a lunch (food) and a coffee/gelato (cafes) stop each day, keep 4-6 stops per day, start around 09:00 and end by 21:00. Interests: ${prefs.interests.join(', ') || 'general sightseeing'}.${trip.notes ? ` Traveller notes: ${trip.notes}` : ''}
Respond with JSON only: {"days":[{"day_index":1,"title":"...","notes":"one-line tip","stops":[{"name":"exact place name","kind":"sight|food|activity|nature","start_time":"09:30","end_time":"11:00","notes":"why / what to do"}]}]}`;

  const user = `WEATHER:\n${weatherLine}\n\nPLACES:\n${menu}`;

  let provider = 'rules';
  let neurons = 0;
  let days: PlannedDay[] | null = null;
  try {
    const out = await generate(env, { system, messages: [{ role: 'user', content: user }], maxTokens: 1800, json: true });
    provider = out.provider;
    neurons = out.neurons;
    const parsed = extractJson<{ days?: { day_index?: number; title?: string; notes?: string; stops?: { name: string; kind?: string; start_time?: string; end_time?: string; notes?: string }[] }[] }>(out.text);
    if (parsed?.days?.length) {
      const built: PlannedDay[] = parsed.days.slice(0, dayCount).map((d, i) => {
        const stops: PlannedStop[] = [];
        for (const s of d.stops ?? []) {
          const p = byName.get(normalize(s.name));
          if (!p) continue;
          stops.push({
            kind: toKind(s.kind, p),
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            address: p.address ?? null,
            start_time: validTime(s.start_time),
            end_time: validTime(s.end_time),
            notes: s.notes?.slice(0, 300) ?? null,
            source: p.source
          });
          if (stops.length >= 7) break;
        }
        return {
          day_index: i + 1,
          title: (d.title ?? `Day ${i + 1}`).slice(0, 80),
          notes: d.notes?.slice(0, 300) ?? null,
          stops
        };
      });
      days = built.every((d) => d.stops.length === 0) ? null : built;
    }
  } catch (err) {
    console.error('planner LLM failed', err);
  }

  if (!days) {
    days = deterministicPlan(dayCount, sights.concat(museums, nature), food, cafes);
  }
  return { days, provider, neurons, externalCalls };
}

function deterministicPlan(dayCount: number, attractions: Place[], food: Place[], cafes: Place[]): PlannedDay[] {
  const remaining = [...attractions];
  const days: PlannedDay[] = [];
  for (let d = 0; d < dayCount; d++) {
    const stops: PlannedStop[] = [];
    if (remaining.length) {
      let current = remaining.shift()!;
      stops.push(stop(current, 'sight', '09:30', '11:00'));
      for (let k = 0; k < 3 && remaining.length; k++) {
        remaining.sort((a, b) => dist(a, current) - dist(b, current));
        current = remaining.shift()!;
        stops.push(stop(current, 'sight', ['11:30', '14:30', '16:30'][k], ['13:00', '16:00', '18:00'][k]));
      }
    }
    const lunch = food[d % Math.max(1, food.length)];
    if (lunch) stops.splice(Math.min(2, stops.length), 0, stop(lunch, 'food', '13:00', '14:15'));
    const coffee = cafes[d % Math.max(1, cafes.length)];
    if (coffee) stops.push(stop(coffee, 'food', '18:15', '19:00'));
    days.push({ day_index: d + 1, title: `Day ${d + 1}`, notes: 'Auto-arranged by proximity; adjust as you like.', stops });
  }
  return days;
}

function stop(p: Place, kind: StopKind, start: string, end: string): PlannedStop {
  return { kind, name: p.name, lat: p.lat, lng: p.lng, address: p.address ?? null, start_time: start, end_time: end, notes: null, source: p.source };
}

function dist(a: Place, b: Place): number {
  return (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
}

function toKind(k: string | undefined, p: Place): StopKind {
  if (k === 'food' || p.category === 'food' || p.category === 'cafes') return 'food';
  if (k === 'nature' || p.category === 'nature') return 'activity';
  if (k === 'activity') return 'activity';
  return 'sight';
}

function validTime(t?: string): string | null {
  return t && /^\d{2}:\d{2}$/.test(t) ? t : null;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

export function countDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
