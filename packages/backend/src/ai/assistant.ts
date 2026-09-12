import type {
  AssistantCard,
  AssistantMode,
  ChatMessage,
  Env,
  GeoPoint,
  GeocodeResult,
  IntentKind,
  Place,
  UserPreferences,
  WeatherSummary
} from '../types';
import { detectIntent, extractDate, extractPlaceMention, extractTopic, poiCategoriesFor } from './intent';
import { generate, type LlmMessage } from './provider';
import { geocode, reverseGeocode, cityLabel } from '../providers/nominatim';
import { nearbyPlaces } from '../providers/overpass';
import { forecast } from '../providers/openmeteo';
import { wikivoyageSummary, wikipediaSummary } from '../providers/wikipedia';
import { linksForIntent } from '../providers/intents';
import { route } from '../providers/osrm';
import { googleEnabled, googleTextSearch } from '../providers/google';

/**
 * The local guide brain. Pipeline per message:
 *   1. classify intent (regex, free)
 *   2. resolve WHERE: place named in the message > live browser location > home city
 *   3. gather grounding data in parallel from free APIs (weather, POIs, wiki, route)
 *   4. build deep links for the user's preferred search engine / booking sites
 *   5. compose a grounded answer with the LLM (or skip the LLM for pure weather)
 *   6. return reply text + structured cards the UI renders (and TTS reads in call mode)
 */
export interface AssistantContext {
  env: Env;
  prefs: UserPreferences;
  mode: AssistantMode;
  location?: GeoPoint;
  history: ChatMessage[];
  tripSummary?: string;
}

export interface AssistantTurn {
  reply: string;
  cards: AssistantCard[];
  intent: IntentKind;
  provider: string;
  model: string;
  neurons: number;
  externalCalls: number;
  resolvedPlace: { name: string; lat: number; lng: number; country_code?: string } | null;
}

export async function answer(ctx: AssistantContext, message: string): Promise<AssistantTurn> {
  const { env, prefs, mode } = ctx;
  const intent = detectIntent(message);
  const topic = extractTopic(message);
  const date = extractDate(message);
  let externalCalls = 0;

  // ---- 2. where -------------------------------------------------------------
  let focus: { name: string; lat: number; lng: number; country_code?: string; isLive: boolean } | null = null;
  const mention = extractPlaceMention(message);
  let mentionGeo: GeocodeResult | null = null;
  if (mention) {
    externalCalls++;
    mentionGeo = (await geocode(env, mention, 1).catch(() => []))[0] ?? null;
  }
  if (mentionGeo && intent !== 'directions') {
    focus = { name: cityLabel(mentionGeo), lat: mentionGeo.lat, lng: mentionGeo.lng, country_code: mentionGeo.country_code, isLive: false };
  } else if (ctx.location) {
    externalCalls++;
    const rev = await reverseGeocode(env, ctx.location.lat, ctx.location.lng);
    focus = {
      name: rev ? cityLabel(rev) : 'your current location',
      lat: ctx.location.lat,
      lng: ctx.location.lng,
      country_code: rev?.country_code,
      isLive: true
    };
  } else if (prefs.home_lat !== null && prefs.home_lng !== null) {
    focus = { name: prefs.home_city ?? 'home', lat: prefs.home_lat, lng: prefs.home_lng, isLive: false };
  } else if (mentionGeo) {
    focus = { name: cityLabel(mentionGeo), lat: mentionGeo.lat, lng: mentionGeo.lng, country_code: mentionGeo.country_code, isLive: false };
  }

  // ---- 3. grounding -----------------------------------------------------------
  const cards: AssistantCard[] = [];
  const facts: string[] = [];
  let weather: WeatherSummary | null = null;
  let places: Place[] = [];

  if (focus) {
    const wantWeather = intent === 'weather' || intent === 'itinerary' || intent === 'nature' || intent === 'general';
    const categories = poiCategoriesFor(intent, message);
    const wantWiki = intent === 'sights' || intent === 'itinerary' || intent === 'general' || intent === 'safety';

    const tasks: Promise<void>[] = [];
    if (wantWeather) {
      externalCalls++;
      tasks.push(
        forecast(env, focus.lat, focus.lng, 5)
          .then((w) => {
            weather = w;
          })
          .catch(() => undefined)
      );
    }
    for (const cat of categories.slice(0, 2)) {
      externalCalls++;
      tasks.push(
        nearbyPlaces(env, focus.lat, focus.lng, cat, focus.isLive ? 1200 : 3000, 8)
          .then((p) => {
            places.push(...p);
          })
          .catch(() => undefined)
      );
    }
    if (googleEnabled(env) && (intent === 'food' || intent === 'hotels' || intent === 'shopping' || intent === 'nightlife')) {
      externalCalls++;
      tasks.push(
        googleTextSearch(env, `${topic ?? intent} in ${focus.name}`, focus, 2500, 6)
          .then((p) => {
            places.push(...p);
          })
          .catch(() => undefined)
      );
    }
    if (wantWiki) {
      externalCalls++;
      const title = focus.name.split(',')[0];
      tasks.push(
        wikivoyageSummary(env, title)
          .then(async (s) => s ?? (await wikipediaSummary(env, title)))
          .then((s) => {
            if (s) {
              facts.push(`Background on ${s.title} (${s.source}): ${s.extract.slice(0, 900)}`);
              cards.push({ type: 'guide', title: s.title, payload: s });
            }
          })
          .catch(() => undefined)
      );
    }
    if (intent === 'directions' && ctx.location) {
      const target = mentionGeo ?? (topic ? (await geocode(env, `${topic} ${focus.name}`, 1).catch(() => []))[0] : undefined);
      if (target) {
        externalCalls += 2;
        tasks.push(
          route(env, ctx.location, target, 'foot')
            .then((r) => {
              if (r) {
                facts.push(
                  `Walking route from the user to ${target.display_name}: ${(r.distance_m / 1000).toFixed(1)} km, about ${Math.round(r.duration_s / 60)} minutes. First steps: ${r.steps
                    .slice(0, 5)
                    .map((s) => s.instruction)
                    .join('; ')}.`
                );
                cards.push({ type: 'route', title: `Walk to ${target.name}`, payload: { ...r, to: target } });
              }
            })
            .catch(() => undefined)
        );
      }
    }
    await Promise.all(tasks);

    places = dedupe(places).slice(0, 10);
    if (places.length) {
      cards.push({ type: 'places', title: `Near ${focus.name}`, payload: places });
      facts.push(
        `Nearby places (from OpenStreetMap${googleEnabled(env) ? '/Google' : ''}), closest first:\n` +
          places
            .map(
              (p) =>
                `- ${p.name} [${p.category}] ${p.distance_m !== undefined ? `${p.distance_m} m away` : ''}${p.address ? `, ${p.address}` : ''}${p.opening_hours ? `, hours: ${p.opening_hours}` : ''}${p.tags?.cuisine ? `, cuisine: ${p.tags.cuisine}` : ''}${p.rating ? `, rating ${p.rating}` : ''}`
            )
            .join('\n')
      );
    }
    if (weather) {
      const w = weather as WeatherSummary;
      cards.push({ type: 'weather', title: `Weather in ${focus.name}`, payload: w });
      facts.push(
        `Weather now in ${focus.name}: ${w.current.description}, ${Math.round(w.current.temperature_c)}°C (feels ${Math.round(w.current.apparent_c)}°C), wind ${Math.round(w.current.wind_kmh)} km/h. Next days: ` +
          w.daily
            .slice(0, 4)
            .map((d) => `${d.date}: ${d.description}, ${Math.round(d.t_min_c)}–${Math.round(d.t_max_c)}°C, rain chance ${d.precipitation_probability}%`)
            .join('; ')
      );
    }

    // ---- 4. deep links ------------------------------------------------------
    const links = linksForIntent(intent, {
      destination: focus.name,
      engine: prefs.search_engine,
      near: focus.isLive ? { lat: focus.lat, lng: focus.lng } : undefined,
      origin: prefs.home_city ?? undefined,
      topic,
      date,
      message
    });
    if (links.length) cards.push({ type: 'links', title: 'Open & book', payload: links });
  }

  // ---- 5. compose -----------------------------------------------------------
  if (intent === 'weather' && weather && focus) {
    const w = weather as WeatherSummary;
    const reply = weatherReply(focus.name, w, mode);
    return { reply, cards, intent, provider: 'rules', model: 'none', neurons: 0, externalCalls, resolvedPlace: focus };
  }

  const system = buildSystemPrompt(prefs, mode, focus, facts, ctx.tripSummary);
  const history: LlmMessage[] = ctx.history
    .filter((m) => m.role !== 'system')
    .slice(-8)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 1500) }));
  const messages: LlmMessage[] = [...history, { role: 'user', content: message }];
  // Ensure the conversation starts with a user turn.
  while (messages.length && messages[0].role !== 'user') messages.shift();

  let reply: string;
  let provider = 'rules';
  let model = 'none';
  let neurons = 0;
  try {
    const out = await generate(env, { system, messages, maxTokens: mode === 'call' ? 220 : 650 });
    reply = out.text || fallbackReply(intent, focus?.name, places);
    provider = out.provider;
    model = out.model;
    neurons = out.neurons;
  } catch (err) {
    console.error('LLM failed, using rules fallback', err);
    reply = fallbackReply(intent, focus?.name, places);
  }

  return { reply, cards, intent, provider, model, neurons, externalCalls, resolvedPlace: focus };
}

function buildSystemPrompt(
  prefs: UserPreferences,
  mode: AssistantMode,
  focus: { name: string; isLive: boolean } | null,
  facts: string[],
  tripSummary?: string
): string {
  const lines = [
    'You are Grand Tour, a warm, knowledgeable local guide and travel concierge. You help travellers navigate, eat, stay, get around, stay safe and enjoy where they are.',
    'Ground every recommendation in the FACTS below when they exist; never invent opening hours, prices or addresses. If facts are missing, say what you would check and point to the links the app shows.',
    'Be concrete: name specific places from the facts, give walking times, mention what to watch out for locally (scams, closures, siesta hours, tipping norms).',
    mode === 'call'
      ? 'CALL MODE: the user is listening to you by voice. Reply in 2-4 short spoken sentences, no lists, no markdown, no URLs.'
      : 'CHAT MODE: reply in a few short paragraphs or a compact list. Use light markdown. Do not paste URLs - the app shows links as cards.',
    `User preferences: units ${prefs.units}, language ${prefs.language}, currency ${prefs.currency}, interests: ${prefs.interests.join(', ') || 'not set'}. Preferred search engine: ${prefs.search_engine}.`,
    focus
      ? `Current focus location: ${focus.name}${focus.isLive ? ' (this is the user’s live GPS position)' : ''}.`
      : 'The user has not shared a location or named a place; ask which city they mean if it matters.',
    tripSummary ? `Active trip: ${tripSummary}` : ''
  ];
  if (facts.length) {
    lines.push('', 'FACTS (fresh data fetched just now):', ...facts.map((f) => `• ${f}`));
  }
  return lines.filter(Boolean).join('\n');
}

function weatherReply(place: string, w: WeatherSummary, mode: AssistantMode): string {
  const c = w.current;
  const today = w.daily[0];
  const tomorrow = w.daily[1];
  const advice =
    c.precipitation_mm > 0 || (today && today.precipitation_probability > 50)
      ? 'Take an umbrella or a light rain jacket.'
      : c.temperature_c > 28
        ? 'It is hot - carry water, use sunscreen and plan indoor sights for early afternoon.'
        : c.temperature_c < 8
          ? 'Dress warm in layers.'
          : 'Light layers should be comfortable.';
  const base = `Right now in ${place} it's ${c.description.toLowerCase()} at ${Math.round(c.temperature_c)}°C (feels like ${Math.round(c.apparent_c)}°C). ` +
    (today ? `Today ranges ${Math.round(today.t_min_c)}–${Math.round(today.t_max_c)}°C with a ${today.precipitation_probability}% chance of rain. ` : '') +
    (tomorrow && mode === 'chat' ? `Tomorrow: ${tomorrow.description.toLowerCase()}, ${Math.round(tomorrow.t_min_c)}–${Math.round(tomorrow.t_max_c)}°C. ` : '') +
    advice;
  return base;
}

function fallbackReply(intent: IntentKind, place: string | undefined, places: Place[]): string {
  const where = place ? ` around ${place}` : '';
  if (places.length) {
    const top = places.slice(0, 5).map((p) => `${p.name}${p.distance_m !== undefined ? ` (${p.distance_m} m)` : ''}`).join(', ');
    return `Here is what I found${where}: ${top}. Tap a card below for directions, or open the booking links.`;
  }
  switch (intent) {
    case 'flights':
      return `I have lined up flight searches${where} in the links below - Google Flights, Skyscanner and Kayak with your route pre-filled.`;
    case 'hotels':
      return `Use the stay links below to compare Booking.com, Google Hotels, Airbnb and Hostelworld${where}.`;
    default:
      return `I could not reach my data sources just now, but the links below open the best searches${where} in your preferred engine and maps.`;
  }
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of places.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))) {
    const k = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}
