import { Hono } from 'hono';
import type { HonoEnv, GeocodeResult } from '../types';
import { geocode, reverseGeocode, cityLabel } from '../providers/nominatim';
import { nearbyPlaces } from '../providers/overpass';
import { forecast } from '../providers/openmeteo';
import { wikipediaSummary, wikivoyageSummary } from '../providers/wikipedia';
import { countryEssentials } from '../providers/countries';
import { PHRASES, LANGUAGE_TAGS } from '../data/essentials';
import { activityLinks, eventLinks, hotelLinks, mapsSearch, webSearch, transportLinks } from '../providers/intents';
import { liveEvents, ticketmasterEnabled } from '../providers/ticketmaster';
import { getPreferences } from '../utils/db';
import { quotaMiddleware } from '../tenancy/quota';
import { COST } from '../tenancy/limits';

/**
 * Destination guide: one call returns everything a traveller needs to survive
 * and enjoy a place - background, weather, essentials (currency, emergency
 * numbers, plugs, phrases), top sights, eats, transit, and booking links.
 * Everything comes from free sources and is cached, so a guide costs the
 * tenant ~7 external calls the first time and ~0 afterwards.
 */
export function createGuideRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/', quotaMiddleware(COST.external(7)), async (c) => {
    const user = c.get('user')!;
    const q = c.req.query('q');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    let geo: GeocodeResult | null = null;
    if (q) geo = (await geocode(c.env, q, 1).catch(() => []))[0] ?? null;
    else if (lat && lng) geo = await reverseGeocode(c.env, parseFloat(lat), parseFloat(lng));
    if (!geo) return c.json({ success: false, error: 'Could not resolve that place' }, 404);

    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    const title = geo.name;
    const label = cityLabel(geo);

    const [voyage, wiki, weather, sights, food, transit, country, events] = await Promise.all([
      wikivoyageSummary(c.env, title),
      wikipediaSummary(c.env, title),
      forecast(c.env, geo.lat, geo.lng, 7).catch(() => null),
      nearbyPlaces(c.env, geo.lat, geo.lng, 'sights', 4000, 12).catch(() => []),
      nearbyPlaces(c.env, geo.lat, geo.lng, 'food', 2000, 10).catch(() => []),
      nearbyPlaces(c.env, geo.lat, geo.lng, 'transport', 2500, 8).catch(() => []),
      geo.country_code ? countryEssentials(c.env, geo.country_code) : Promise.resolve(null),
      ticketmasterEnabled(c.env) ? liveEvents(c.env, geo.lat, geo.lng, 30, undefined, 8) : Promise.resolve([])
    ]);

    const phraseLang = country?.languages.map((l) => LANGUAGE_TAGS[l]).find((tag) => tag && PHRASES[tag]);
    const phrases = phraseLang ? { language: phraseLang, ...PHRASES[phraseLang] } : null;

    const links = {
      stay: hotelLinks({ destination: label }),
      do: activityLinks(label),
      events: eventLinks(label),
      transport: prefs.home_city ? transportLinks(prefs.home_city, label) : [],
      maps: [mapsSearch(`top attractions ${label}`), mapsSearch(`restaurants ${label}`)],
      search: [webSearch(prefs.search_engine, `${label} travel tips`), webSearch(prefs.search_engine, `${label} common tourist scams`), webSearch(prefs.search_engine, `${label} public transport tickets`)]
    };

    const artKeyword = pickArtKeyword(geo, country?.region);

    return c.json({
      success: true,
      data: {
        place: { ...geo, label },
        summary: voyage ?? wiki,
        wikipedia: wiki,
        weather,
        essentials: country,
        phrases,
        sights,
        food,
        transit,
        events,
        links,
        art_keyword: artKeyword,
        sources: ['OpenStreetMap', 'Wikivoyage', 'Wikipedia', 'Open-Meteo', 'Static country tables', ...(events.length ? ['Ticketmaster'] : [])]
      }
    });
  });

  return router;
}

/** Hint for the frontend to pick a fitting painting for the guide header. */
function pickArtKeyword(geo: GeocodeResult, region?: string): string {
  const name = geo.display_name.toLowerCase();
  if (/rome|roma|lazio/.test(name)) return 'rome';
  if (/venice|venezia/.test(name)) return 'venice';
  if (/florence|firenze|tuscany|toscana/.test(name)) return 'florence';
  if (/paris|france/.test(name)) return 'paris';
  if (/netherlands|amsterdam|delft/.test(name)) return 'netherlands';
  if (/spain|españa|madrid|toledo/.test(name)) return 'spain';
  if (/greece|athens/.test(name)) return 'greece';
  if (/vienna|austria/.test(name)) return 'vienna';
  if (/germany|deutschland/.test(name)) return 'germany';
  if (region === 'Europe') return 'europe';
  return 'world';
}
