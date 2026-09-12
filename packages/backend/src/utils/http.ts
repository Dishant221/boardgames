import type { Env } from '../types';

/**
 * fetch() wrapper for the free public data APIs we depend on (OpenStreetMap
 * Nominatim/Overpass, OSRM, Open-Meteo, Wikipedia).
 *
 *  - Sends an identifying User-Agent (required by the OSM usage policies).
 *  - Caches successful GET responses in the Workers Cache API (free, unlimited,
 *    per-colo) so repeated questions about the same city cost nothing - this is
 *    how we keep well under the external-call quota without spending KV writes.
 *  - Applies a hard timeout so a slow upstream never burns Worker CPU budget.
 */
export interface CachedFetchOptions {
  ttlSeconds?: number;
  timeoutMs?: number;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
}

export class UpstreamError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function cachedFetch(
  env: Pick<Env, 'APP_USER_AGENT'>,
  provider: string,
  url: string,
  opts: CachedFetchOptions = {}
): Promise<Response> {
  const method = opts.method ?? 'GET';
  const ttl = opts.ttlSeconds ?? 3600;
  const cacheKey = new Request(cacheKeyFor(url, method, opts.body), { method: 'GET' });
  const cache = (caches as unknown as { default: Cache }).default;

  if (ttl > 0) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      // cache unavailable (e.g. local dev) - fall through to network
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      body: opts.body,
      signal: controller.signal,
      headers: {
        'User-Agent': env.APP_USER_AGENT ?? 'GrandTour/0.2 (travel assistant)',
        Accept: 'application/json',
        ...(opts.headers ?? {})
      }
    });
  } catch (err) {
    clearTimeout(timer);
    throw new UpstreamError(provider, 0, `${provider} unreachable: ${(err as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new UpstreamError(provider, res.status, `${provider} responded ${res.status}`);
  }

  if (ttl > 0) {
    const toCache = new Response(res.clone().body, res);
    toCache.headers.set('Cache-Control', `public, max-age=${ttl}`);
    toCache.headers.delete('Set-Cookie');
    try {
      await cache.put(cacheKey, toCache);
    } catch {
      // ignore cache write failures
    }
  }
  return res;
}

export async function cachedJson<T>(
  env: Pick<Env, 'APP_USER_AGENT'>,
  provider: string,
  url: string,
  opts: CachedFetchOptions = {}
): Promise<T> {
  const res = await cachedFetch(env, provider, url, opts);
  return (await res.json()) as T;
}

function cacheKeyFor(url: string, method: string, body?: string): string {
  if (method === 'GET' || !body) return url;
  // POST bodies (Overpass queries) are folded into a synthetic GET key.
  const u = new URL(url);
  u.searchParams.set('__body', hash(body));
  return u.toString();
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
