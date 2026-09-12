import { Hono } from 'hono';
import type { HonoEnv, SearchEngine } from '../types';
import { quotaMiddleware } from '../tenancy/quota';
import { COST } from '../tenancy/limits';
import { getPreferences } from '../utils/db';
import { forecast } from '../providers/openmeteo';
import { nearbyPlaces } from '../providers/overpass';
import { liveEvents, ticketmasterEnabled } from '../providers/ticketmaster';
import { reverseGeocode, cityLabel, geocode } from '../providers/nominatim';
import {
  eventLinks,
  flightLinks,
  hotelLinks,
  activityLinks,
  transportLinks,
  webSearch,
  mapsSearch,
  foodLinks,
  shoppingLinks
} from '../providers/intents';
import { tenantClient } from '../tenancy/quota';

/**
 * Discovery endpoints: weather, events, and booking-intent suggestions.
 * Booking suggestions never call a paid API - they compose deep links for the
 * user's preferred engine and the major booking sites with the intent
 * (dates, destination, guests, keywords) pre-filled.
 */
export function createDiscoverRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/weather', quotaMiddleware(COST.external(1)), async (c) => {
    const lat = parseFloat(c.req.query('lat') ?? '');
    const lng = parseFloat(c.req.query('lng') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return c.json({ success: false, error: 'lat/lng required' }, 400);
    try {
      return c.json({ success: true, data: await forecast(c.env, lat, lng, Number(c.req.query('days') ?? 7)) });
    } catch {
      return c.json({ success: false, error: 'Weather provider unavailable' }, 502);
    }
  });

  router.get('/events', quotaMiddleware(COST.external(2)), async (c) => {
    const user = c.get('user')!;
    const lat = parseFloat(c.req.query('lat') ?? '');
    const lng = parseFloat(c.req.query('lng') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return c.json({ success: false, error: 'lat/lng required' }, 400);
    const keyword = c.req.query('q') || undefined;
    const [live, venues, rev] = await Promise.all([
      ticketmasterEnabled(c.env) ? liveEvents(c.env, lat, lng, Number(c.req.query('radius_km') ?? 25), keyword, 24) : Promise.resolve([]),
      nearbyPlaces(c.env, lat, lng, 'events', 3000, 20).catch(() => []),
      reverseGeocode(c.env, lat, lng)
    ]);
    const label = rev ? cityLabel(rev) : `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    return c.json({
      success: true,
      data: {
        place: label,
        live,
        venues,
        links: [...eventLinks(label, c.req.query('date') || undefined), webSearch(prefs.search_engine, `${keyword ? `${keyword} ` : ''}events in ${label} this week`)],
        live_source: ticketmasterEnabled(c.env) ? 'ticketmaster' : null
      }
    });
  });

  /**
   * POST /bookings/suggest
   * { kind: 'flights'|'hotels'|'activities'|'transport'|'food'|'shopping'|'search',
   *   destination, origin?, depart?, return?, checkin?, checkout?, adults?, topic?, keywords? }
   */
  router.post('/bookings/suggest', quotaMiddleware(), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as {
      kind: string;
      destination?: string;
      origin?: string;
      depart?: string;
      return?: string;
      checkin?: string;
      checkout?: string;
      adults?: number;
      topic?: string;
      keywords?: string;
      lat?: number;
      lng?: number;
    };
    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    const engine: SearchEngine = prefs.search_engine;
    let destination = body.destination?.trim() || '';
    if (!destination && typeof body.lat === 'number' && typeof body.lng === 'number') {
      const rev = await reverseGeocode(c.env, body.lat, body.lng);
      destination = rev ? cityLabel(rev) : '';
    }
    if (!destination && prefs.home_city) destination = prefs.home_city;
    if (!destination && body.kind !== 'search') return c.json({ success: false, error: 'destination required' }, 400);
    const origin = body.origin?.trim() || prefs.home_city || undefined;
    const near = typeof body.lat === 'number' && typeof body.lng === 'number' ? { lat: body.lat, lng: body.lng } : undefined;

    let links;
    let tips: string[] = [];
    switch (body.kind) {
      case 'flights':
        links = [...flightLinks({ from: origin, to: destination, depart: body.depart, return: body.return, adults: body.adults }), webSearch(engine, `cheapest time to fly to ${destination}`)];
        tips = ['Compare Tuesday/Wednesday departures - usually cheapest.', 'Check nearby airports; Skyscanner "whole month" view shows price dips.', 'Book 3-8 weeks out for short-haul, 2-4 months for long-haul.'];
        break;
      case 'hotels':
        links = [...hotelLinks({ destination, checkin: body.checkin, checkout: body.checkout, adults: body.adults, near }), webSearch(engine, `best neighbourhoods to stay in ${destination}`)];
        tips = ['Stay within a 15-minute walk of a metro/tram stop.', 'Read the 3-star reviews - they are the most honest.', 'Check if a city tax is paid on arrival in cash.'];
        break;
      case 'activities':
        links = [...activityLinks(destination, body.topic), mapsSearch(`${body.topic ?? 'things to do'} ${destination}`, near), webSearch(engine, `${destination} ${body.topic ?? 'skip the line tickets'}`)];
        tips = ['Book timed-entry for major museums days ahead.', 'Many museums have a free first Sunday - check the official site.'];
        break;
      case 'transport':
        links = [...transportLinks(origin ?? 'my location', destination, body.depart), mapsSearch(`train station ${destination}`, near)];
        tips = ['Rome2Rio compares train, bus, ferry and flights in one view.', 'Regional trains rarely need advance booking; high-speed ones do.'];
        break;
      case 'food':
        links = foodLinks(destination, body.topic, near);
        tips = ['Avoid restaurants with photo menus at the main sights; walk two streets away.', 'Lunch menus (menù del giorno / menu du jour) are the best value.'];
        break;
      case 'shopping':
        links = shoppingLinks(destination, body.topic, engine);
        tips = ['Ask for the tax-free form when spending above the VAT refund threshold as a non-EU visitor.'];
        break;
      default:
        links = [webSearch(engine, body.keywords || body.topic || destination), mapsSearch(body.keywords || destination, near)];
    }
    return c.json({ success: true, data: { destination, origin, engine, links, tips } });
  });

  /** Quick geocode helper used by forms: /discover/resolve?q= */
  router.get('/resolve', quotaMiddleware(COST.external(1)), async (c) => {
    const q = c.req.query('q') ?? '';
    if (q.length < 2) return c.json({ success: false, error: 'q required' }, 400);
    const r = (await geocode(c.env, q, 1).catch(() => []))[0] ?? null;
    return c.json({ success: true, data: r ? { ...r, label: cityLabel(r) } : null });
  });

  /** Tenant usage dashboard data. */
  router.get('/usage', quotaMiddleware(), async (c) => {
    return c.json({ success: true, data: await tenantClient(c).usage() });
  });

  return router;
}
