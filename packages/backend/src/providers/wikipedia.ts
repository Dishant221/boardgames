import type { Env } from '../types';
import { cachedJson } from '../utils/http';

/**
 * Wikipedia + Wikivoyage REST summaries - free destination background and
 * traveller-oriented overviews. Cached for 7 days.
 */
export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: string;
  url: string;
  source: 'wikipedia' | 'wikivoyage';
}

interface RestSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page: string } };
  type?: string;
}

async function summary(env: Env, host: 'en.wikipedia.org' | 'en.wikivoyage.org', title: string): Promise<WikiSummary | null> {
  const url = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const data = await cachedJson<RestSummary>(env, host, url, { ttlSeconds: 7 * 86400 });
    if (!data.extract || data.type === 'disambiguation') return null;
    return {
      title: data.title,
      extract: data.extract,
      description: data.description,
      thumbnail: data.originalimage?.source ?? data.thumbnail?.source,
      url: data.content_urls?.desktop?.page ?? `https://${host}/wiki/${encodeURIComponent(title)}`,
      source: host === 'en.wikipedia.org' ? 'wikipedia' : 'wikivoyage'
    };
  } catch {
    return null;
  }
}

export function wikipediaSummary(env: Env, title: string) {
  return summary(env, 'en.wikipedia.org', title);
}

export function wikivoyageSummary(env: Env, title: string) {
  return summary(env, 'en.wikivoyage.org', title);
}

interface GeoSearchResponse {
  query?: { geosearch?: { pageid: number; title: string; lat: number; lon: number; dist: number }[] };
}

/** Wikipedia articles with coordinates near a point - great "what is this building?" data. */
export async function wikipediaNearby(env: Env, lat: number, lng: number, radiusM = 1500, limit = 15) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&format=json&origin=*` +
    `&gscoord=${lat.toFixed(4)}%7C${lng.toFixed(4)}&gsradius=${Math.min(10000, radiusM)}&gslimit=${limit}`;
  try {
    const data = await cachedJson<GeoSearchResponse>(env, 'wikipedia', url, { ttlSeconds: 86400 });
    return (data.query?.geosearch ?? []).map((g) => ({
      id: `wiki_${g.pageid}`,
      title: g.title,
      lat: g.lat,
      lng: g.lon,
      distance_m: Math.round(g.dist),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(g.title.replace(/ /g, '_'))}`
    }));
  } catch {
    return [];
  }
}
