import type { GeoPoint, IntentKind, IntentLink, SearchEngine } from '../types';

/**
 * Deep-link builder. This is how the assistant "searches on Google or the user's
 * preferred browser/engine" and points at bookings without paying for any API:
 * every suggestion is a ready-to-open URL with the user's intent pre-filled.
 * All builders are pure functions (unit-tested in test/intents.test.ts).
 */
export const SEARCH_ENGINES: Record<SearchEngine, { label: string; url: (q: string) => string }> = {
  google: { label: 'Google', url: (q) => `https://www.google.com/search?q=${enc(q)}` },
  bing: { label: 'Bing', url: (q) => `https://www.bing.com/search?q=${enc(q)}` },
  duckduckgo: { label: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${enc(q)}` },
  brave: { label: 'Brave Search', url: (q) => `https://search.brave.com/search?q=${enc(q)}` },
  ecosia: { label: 'Ecosia', url: (q) => `https://www.ecosia.org/search?q=${enc(q)}` }
};

export function webSearch(engine: SearchEngine, query: string): IntentLink {
  const e = SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.google;
  return { label: `Search "${query}" on ${e.label}`, url: e.url(query), provider: e.label, kind: 'search' };
}

export function mapsSearch(query: string, near?: GeoPoint): IntentLink {
  const q = near ? `${query} near ${near.lat.toFixed(5)},${near.lng.toFixed(5)}` : query;
  return {
    label: `Open "${query}" in Google Maps`,
    url: `https://www.google.com/maps/search/?api=1&query=${enc(q)}`,
    provider: 'Google Maps',
    kind: 'maps'
  };
}

export function mapsDirections(to: GeoPoint | string, from?: GeoPoint, mode: 'walking' | 'transit' | 'driving' | 'bicycling' = 'walking'): IntentLink {
  const dest = typeof to === 'string' ? to : `${to.lat},${to.lng}`;
  const origin = from ? `&origin=${from.lat},${from.lng}` : '';
  return {
    label: `Directions (${mode}) in Google Maps`,
    url: `https://www.google.com/maps/dir/?api=1${origin}&destination=${enc(dest)}&travelmode=${mode}`,
    provider: 'Google Maps',
    kind: 'directions'
  };
}

export function osmLink(p: GeoPoint, zoom = 16): IntentLink {
  return {
    label: 'Open in OpenStreetMap',
    url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=${zoom}/${p.lat}/${p.lng}`,
    provider: 'OpenStreetMap',
    kind: 'maps'
  };
}

export interface FlightQuery {
  from?: string;
  to: string;
  depart?: string; // YYYY-MM-DD
  return?: string;
  adults?: number;
}

export function flightLinks(q: FlightQuery): IntentLink[] {
  const adults = q.adults ?? 1;
  const dates = [q.depart, q.return].filter(Boolean).join(' returning ');
  const natural = `Flights ${q.from ? `from ${q.from} ` : ''}to ${q.to}${q.depart ? ` on ${q.depart}` : ''}${q.return ? ` returning ${q.return}` : ''} ${adults} adult${adults > 1 ? 's' : ''}`;
  const links: IntentLink[] = [
    { label: 'Google Flights', url: `https://www.google.com/travel/flights?q=${enc(natural)}`, provider: 'Google Flights', kind: 'flights' },
    {
      label: 'Skyscanner',
      url: `https://www.skyscanner.net/transport/flights/${slug(q.from ?? 'anywhere')}/${slug(q.to)}/${q.depart ? compact(q.depart) : ''}${q.return ? `/${compact(q.return)}` : ''}/?adults=${adults}`,
      provider: 'Skyscanner',
      kind: 'flights'
    },
    {
      label: 'Kayak',
      url: `https://www.kayak.com/flights/${enc(q.from ?? 'anywhere')}-${enc(q.to)}/${q.depart ?? ''}${q.return ? `/${q.return}` : ''}?adults=${adults}`,
      provider: 'Kayak',
      kind: 'flights'
    }
  ];
  void dates;
  return links;
}

export interface HotelQuery {
  destination: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  rooms?: number;
  near?: GeoPoint;
}

export function hotelLinks(q: HotelQuery): IntentLink[] {
  const adults = q.adults ?? 2;
  const rooms = q.rooms ?? 1;
  const links: IntentLink[] = [
    {
      label: 'Booking.com',
      url: `https://www.booking.com/searchresults.html?ss=${enc(q.destination)}${q.checkin ? `&checkin=${q.checkin}` : ''}${q.checkout ? `&checkout=${q.checkout}` : ''}&group_adults=${adults}&no_rooms=${rooms}`,
      provider: 'Booking.com',
      kind: 'hotels'
    },
    {
      label: 'Google Hotels',
      url: `https://www.google.com/travel/hotels/${enc(q.destination)}${q.checkin && q.checkout ? `?q=hotels%20in%20${enc(q.destination)}&checkin=${q.checkin}&checkout=${q.checkout}` : ''}`,
      provider: 'Google Hotels',
      kind: 'hotels'
    },
    {
      label: 'Airbnb',
      url: `https://www.airbnb.com/s/${enc(q.destination)}/homes?adults=${adults}${q.checkin ? `&checkin=${q.checkin}` : ''}${q.checkout ? `&checkout=${q.checkout}` : ''}`,
      provider: 'Airbnb',
      kind: 'hotels'
    },
    {
      label: 'Hostelworld',
      url: `https://www.hostelworld.com/search?search_keywords=${enc(q.destination)}${q.checkin ? `&date_from=${q.checkin}` : ''}${q.checkout ? `&date_to=${q.checkout}` : ''}&number_of_guests=${adults}`,
      provider: 'Hostelworld',
      kind: 'hotels'
    }
  ];
  return links;
}

export function activityLinks(destination: string, topic?: string): IntentLink[] {
  const q = topic ? `${topic} ${destination}` : destination;
  return [
    { label: 'GetYourGuide', url: `https://www.getyourguide.com/s/?q=${enc(q)}`, provider: 'GetYourGuide', kind: 'sights' },
    { label: 'Viator', url: `https://www.viator.com/searchResults/all?text=${enc(q)}`, provider: 'Viator', kind: 'sights' },
    { label: 'Tiqets', url: `https://www.tiqets.com/en/search?q=${enc(q)}`, provider: 'Tiqets', kind: 'sights' }
  ];
}

export function eventLinks(destination: string, date?: string): IntentLink[] {
  const d = date ? ` ${date}` : '';
  return [
    { label: 'Eventbrite', url: `https://www.eventbrite.com/d/${slug(destination)}/events/`, provider: 'Eventbrite', kind: 'events' },
    { label: 'Ticketmaster', url: `https://www.ticketmaster.com/search?q=${enc(destination + d)}`, provider: 'Ticketmaster', kind: 'events' },
    { label: 'Meetup', url: `https://www.meetup.com/find/?location=${enc(destination)}&source=EVENTS`, provider: 'Meetup', kind: 'events' },
    { label: 'Songkick concerts', url: `https://www.songkick.com/search?query=${enc(destination)}&type=upcoming`, provider: 'Songkick', kind: 'events' }
  ];
}

export function transportLinks(from: string, to: string, date?: string): IntentLink[] {
  return [
    { label: 'Rome2Rio (all modes)', url: `https://www.rome2rio.com/map/${slug(from)}/${slug(to)}`, provider: 'Rome2Rio', kind: 'transport' },
    { label: 'Omio trains & buses', url: `https://www.omio.com/search?departure=${enc(from)}&arrival=${enc(to)}${date ? `&date=${date}` : ''}`, provider: 'Omio', kind: 'transport' },
    { label: 'Trainline', url: `https://www.thetrainline.com/en/train-times/${slug(from)}-to-${slug(to)}`, provider: 'Trainline', kind: 'transport' },
    { label: 'FlixBus', url: `https://global.flixbus.com/search?departureCity=${enc(from)}&arrivalCity=${enc(to)}`, provider: 'FlixBus', kind: 'transport' }
  ];
}

export function foodLinks(destination: string, cuisine?: string, near?: GeoPoint): IntentLink[] {
  const q = cuisine ? `${cuisine} restaurants` : 'best restaurants';
  return [
    mapsSearch(`${q} ${destination}`, near),
    { label: 'TheFork reservations', url: `https://www.thefork.com/search?cityName=${enc(destination)}${cuisine ? `&q=${enc(cuisine)}` : ''}`, provider: 'TheFork', kind: 'food' },
    { label: 'Tripadvisor restaurants', url: `https://www.tripadvisor.com/Search?q=${enc(`${q} ${destination}`)}`, provider: 'Tripadvisor', kind: 'food' }
  ];
}

export function shoppingLinks(destination: string, item?: string, engine: SearchEngine = 'google'): IntentLink[] {
  const q = item ? `where to buy ${item} in ${destination}` : `shopping streets and markets in ${destination}`;
  return [webSearch(engine, q), mapsSearch(item ? `${item} shop ${destination}` : `shopping ${destination}`)];
}

/**
 * Given the detected intent and context, return the best set of deep links.
 */
export function linksForIntent(
  intent: IntentKind,
  ctx: { destination: string; engine: SearchEngine; near?: GeoPoint; origin?: string; topic?: string; date?: string; message: string }
): IntentLink[] {
  const { destination, engine, near } = ctx;
  switch (intent) {
    case 'flights':
      return [...flightLinks({ from: ctx.origin, to: destination, depart: ctx.date }), webSearch(engine, `cheap flights to ${destination}`)];
    case 'hotels':
      return [...hotelLinks({ destination, checkin: ctx.date, near }), webSearch(engine, `best areas to stay in ${destination}`)];
    case 'food':
      return foodLinks(destination, ctx.topic, near);
    case 'sights':
    case 'itinerary':
      return [...activityLinks(destination, ctx.topic), mapsSearch(`top attractions ${destination}`, near), webSearch(engine, `${destination} ${ctx.topic ?? 'things to do'}`)];
    case 'events':
    case 'nightlife':
      return [...eventLinks(destination, ctx.date), webSearch(engine, `${intent === 'nightlife' ? 'nightlife' : 'events this week'} ${destination}`)];
    case 'transport':
      return [...transportLinks(ctx.origin ?? 'my location', destination, ctx.date), mapsDirections(destination, near, 'transit')];
    case 'directions':
      return [mapsDirections(ctx.topic ?? destination, near, 'walking'), mapsDirections(ctx.topic ?? destination, near, 'transit')];
    case 'weather':
      return [webSearch(engine, `weather ${destination} this week`)];
    case 'shopping':
      return shoppingLinks(destination, ctx.topic, engine);
    case 'safety':
      return [webSearch(engine, `${destination} travel safety advice`), mapsSearch(`pharmacy ${destination}`, near), mapsSearch(`hospital ${destination}`, near)];
    case 'nature':
      return [mapsSearch(`parks and nature ${destination}`, near), webSearch(engine, `day trips nature near ${destination}`)];
    default:
      return [webSearch(engine, ctx.message.slice(0, 120)), mapsSearch(destination, near)];
  }
}

// --------------------------------------------------------------------- utils

function enc(s: string): string {
  return encodeURIComponent(s);
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compact(date: string): string {
  // 2026-10-01 -> 261001 (Skyscanner format)
  return date.replace(/-/g, '').slice(2);
}
