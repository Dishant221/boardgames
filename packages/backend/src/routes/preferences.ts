import { Hono } from 'hono';
import type { HonoEnv, UserPreferences, SearchEngine } from '../types';
import { getPreferences, upsertPreferences } from '../utils/db';
import { geocode, cityLabel } from '../providers/nominatim';
import { quotaMiddleware, tenantClient } from '../tenancy/quota';
import { COST } from '../tenancy/limits';

const ENGINES: SearchEngine[] = ['google', 'bing', 'duckduckgo', 'brave', 'ecosia'];

export function createPreferencesRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/', quotaMiddleware(COST.d1Read(1)), async (c) => {
    const user = c.get('user')!;
    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    return c.json({ success: true, data: prefs });
  });

  router.put('/', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as Partial<UserPreferences> & { home_city_query?: string };
    const current = await getPreferences(c.env.DB, user.tenantId, user.userId);

    const next: UserPreferences = {
      ...current,
      search_engine: body.search_engine && ENGINES.includes(body.search_engine) ? body.search_engine : current.search_engine,
      units: body.units === 'imperial' ? 'imperial' : body.units === 'metric' ? 'metric' : current.units,
      language: typeof body.language === 'string' ? body.language.slice(0, 10) : current.language,
      currency: typeof body.currency === 'string' ? body.currency.toUpperCase().slice(0, 3) : current.currency,
      interests: Array.isArray(body.interests) ? body.interests.map((s) => String(s).slice(0, 30)).slice(0, 12) : current.interests,
      voice_enabled: typeof body.voice_enabled === 'boolean' ? body.voice_enabled : current.voice_enabled
    };

    if (body.home_city_query !== undefined) {
      if (!body.home_city_query) {
        next.home_city = null;
        next.home_lat = null;
        next.home_lng = null;
      } else {
        const geo = (await geocode(c.env, body.home_city_query, 1).catch(() => []))[0];
        if (geo) {
          next.home_city = cityLabel(geo);
          next.home_lat = geo.lat;
          next.home_lng = geo.lng;
        } else {
          next.home_city = body.home_city_query.slice(0, 80);
        }
      }
    } else if (body.home_city !== undefined) {
      next.home_city = body.home_city;
      next.home_lat = body.home_lat ?? current.home_lat;
      next.home_lng = body.home_lng ?? current.home_lng;
    }

    await upsertPreferences(c.env.DB, next);
    return c.json({ success: true, data: next });
  });

  /** Browser shares its live position (kept only in the tenant's own DO). */
  router.post('/location', quotaMiddleware(), async (c) => {
    const body = (await c.req.json()) as { lat: number; lng: number; accuracy_m?: number };
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return c.json({ success: false, error: 'lat/lng required' }, 400);
    }
    await tenantClient(c).setLocation({ lat: body.lat, lng: body.lng, accuracy_m: body.accuracy_m });
    return c.json({ success: true });
  });

  return router;
}
