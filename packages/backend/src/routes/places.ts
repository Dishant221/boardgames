import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { geocode, reverseGeocode } from '../providers/nominatim';
import { nearbyPlaces, POI_CATEGORIES, type PoiCategory } from '../providers/overpass';
import { wikipediaNearby } from '../providers/wikipedia';
import { googleEnabled, googleTextSearch } from '../providers/google';
import { route, type TravelMode } from '../providers/osrm';
import { mapsDirections, osmLink } from '../providers/intents';
import { listSavedPlaces, savePlace, deleteSavedPlace } from '../utils/db';
import { quotaMiddleware } from '../tenancy/quota';
import { COST } from '../tenancy/limits';
import { UpstreamError } from '../utils/http';

export function createPlacesRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/categories', (c) => {
    return c.json({
      success: true,
      data: (Object.keys(POI_CATEGORIES) as PoiCategory[]).map((k) => ({ key: k, label: POI_CATEGORIES[k].label }))
    });
  });

  /** Forward geocoding: ?q=Rome */
  router.get('/search', quotaMiddleware(COST.external(1)), async (c) => {
    const q = c.req.query('q') ?? '';
    if (q.trim().length < 2) return c.json({ success: false, error: 'q must be at least 2 characters' }, 400);
    try {
      const results = await geocode(c.env, q, Number(c.req.query('limit') ?? 5));
      return c.json({ success: true, data: results });
    } catch (err) {
      return upstream(c, err);
    }
  });

  /** Reverse geocoding: ?lat=&lng= */
  router.get('/reverse', quotaMiddleware(COST.external(1)), async (c) => {
    const { lat, lng } = coords(c.req.query('lat'), c.req.query('lng'));
    if (lat === null || lng === null) return c.json({ success: false, error: 'lat/lng required' }, 400);
    const r = await reverseGeocode(c.env, lat, lng);
    return c.json({ success: true, data: r });
  });

  /** Nearby POIs: ?lat=&lng=&category=food&radius=1500 */
  router.get('/nearby', quotaMiddleware(COST.external(1)), async (c) => {
    const { lat, lng } = coords(c.req.query('lat'), c.req.query('lng'));
    if (lat === null || lng === null) return c.json({ success: false, error: 'lat/lng required' }, 400);
    const category = (c.req.query('category') ?? 'sights') as PoiCategory;
    if (!POI_CATEGORIES[category]) return c.json({ success: false, error: 'Unknown category' }, 400);
    const radius = Number(c.req.query('radius') ?? 1500);
    const limit = Math.min(50, Number(c.req.query('limit') ?? 30));
    try {
      const places = await nearbyPlaces(c.env, lat, lng, category, radius, limit);
      return c.json({ success: true, data: places, meta: { source: 'openstreetmap', category, radius_m: radius } });
    } catch (err) {
      return upstream(c, err);
    }
  });

  /** Free-text nearby search (Google Places when configured, else OSM by best-guess category). */
  router.get('/find', quotaMiddleware(COST.external(1)), async (c) => {
    const { lat, lng } = coords(c.req.query('lat'), c.req.query('lng'));
    const q = c.req.query('q') ?? '';
    if (lat === null || lng === null || !q) return c.json({ success: false, error: 'q, lat and lng required' }, 400);
    if (googleEnabled(c.env)) {
      const places = await googleTextSearch(c.env, q, { lat, lng }, 3000, 15);
      if (places.length) return c.json({ success: true, data: places, meta: { source: 'google' } });
    }
    const category = guessCategory(q);
    try {
      const places = await nearbyPlaces(c.env, lat, lng, category, 2500, 20);
      const filtered = places.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.tags?.cuisine ?? '').includes(q.toLowerCase()));
      return c.json({ success: true, data: filtered.length ? filtered : places, meta: { source: 'openstreetmap', category } });
    } catch (err) {
      return upstream(c, err);
    }
  });

  /** "What is around me?" - Wikipedia articles with coordinates near a point. */
  router.get('/landmarks', quotaMiddleware(COST.external(1)), async (c) => {
    const { lat, lng } = coords(c.req.query('lat'), c.req.query('lng'));
    if (lat === null || lng === null) return c.json({ success: false, error: 'lat/lng required' }, 400);
    const items = await wikipediaNearby(c.env, lat, lng, Number(c.req.query('radius') ?? 1500));
    return c.json({ success: true, data: items });
  });

  /** Directions: ?from=lat,lng&to=lat,lng&mode=foot|bike|car */
  router.get('/directions', quotaMiddleware(COST.external(1)), async (c) => {
    const from = pair(c.req.query('from'));
    const to = pair(c.req.query('to'));
    const mode = (c.req.query('mode') ?? 'foot') as TravelMode;
    if (!from || !to) return c.json({ success: false, error: 'from and to required as lat,lng' }, 400);
    if (!['foot', 'bike', 'car'].includes(mode)) return c.json({ success: false, error: 'mode must be foot|bike|car' }, 400);
    try {
      const r = await route(c.env, from, to, mode);
      const links = [mapsDirections(to, from, mode === 'car' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking'), mapsDirections(to, from, 'transit'), osmLink(to)];
      return c.json({ success: true, data: r, links });
    } catch (err) {
      return upstream(c, err);
    }
  });

  // ------------------------------------------------------------ saved places
  router.get('/saved', quotaMiddleware(COST.d1Read(20)), async (c) => {
    const user = c.get('user')!;
    const data = await listSavedPlaces(c.env.DB, user.tenantId, user.userId);
    return c.json({ success: true, data });
  });

  router.post('/saved', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as Parameters<typeof savePlace>[3];
    if (!body?.name || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return c.json({ success: false, error: 'name, lat, lng required' }, 400);
    }
    const saved = await savePlace(c.env.DB, user.tenantId, user.userId, { ...body, category: body.category ?? 'place' });
    return c.json({ success: true, data: saved }, 201);
  });

  router.delete('/saved/:id', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const ok = await deleteSavedPlace(c.env.DB, user.tenantId, user.userId, c.req.param('id')!);
    return ok ? c.json({ success: true }) : c.json({ success: false, error: 'Not found' }, 404);
  });

  return router;
}

function coords(lat?: string, lng?: string): { lat: number | null; lng: number | null } {
  const la = lat !== undefined ? parseFloat(lat) : NaN;
  const lo = lng !== undefined ? parseFloat(lng) : NaN;
  return { lat: Number.isFinite(la) ? la : null, lng: Number.isFinite(lo) ? lo : null };
}

function pair(s?: string): { lat: number; lng: number } | null {
  if (!s) return null;
  const [a, b] = s.split(',').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
}

function guessCategory(q: string): PoiCategory {
  const s = q.toLowerCase();
  if (/pharm|medic/.test(s)) return 'pharmacy';
  if (/hospital|clinic|doctor/.test(s)) return 'hospital';
  if (/atm|cash|bank|exchange/.test(s)) return 'atm';
  if (/hotel|hostel|stay/.test(s)) return 'hotels';
  if (/coffee|cafe|café|bakery|gelato|ice/.test(s)) return 'cafes';
  if (/bar|pub|club|beer|wine/.test(s)) return 'nightlife';
  if (/museum|gallery|art/.test(s)) return 'museums';
  if (/market|shop|store|mall|souvenir/.test(s)) return 'shopping';
  if (/super|grocer|food store/.test(s)) return 'supermarket';
  if (/train|metro|bus|station|tram/.test(s)) return 'transport';
  if (/park|garden|beach|nature/.test(s)) return 'nature';
  if (/toilet|restroom|wc/.test(s)) return 'toilets';
  if (/police/.test(s)) return 'police';
  if (/wifi/.test(s)) return 'wifi';
  if (/restaurant|eat|pizza|pasta|sushi|food|dinner|lunch/.test(s)) return 'food';
  return 'sights';
}

function upstream(c: { json: (b: unknown, s?: number) => Response }, err: unknown): Response {
  if (err instanceof UpstreamError) {
    return c.json({ success: false, error: `Data provider unavailable (${err.provider}). Try again shortly.` }, 502 as never);
  }
  console.error(err);
  return c.json({ success: false, error: 'Internal server error' }, 500 as never);
}
