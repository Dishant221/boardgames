import type { Env, MetricBag, MetricName } from '../types';

/**
 * Cloudflare Free-tier daily limits as published for the Workers Free plan
 * (Sept 2026). Where Cloudflare states a monthly figure we convert to a per-day
 * budget (monthly / 30) so every quota in the system speaks the same unit.
 *
 * These are the ACCOUNT-WIDE ceilings. This project is only allowed to consume
 * PROJECT_SHARE (default 40%) of each of them - see projectBudget().
 */
export const CLOUDFLARE_FREE_TIER_DAILY: Record<MetricName, number> = {
  workers_requests: 100_000, // Workers: 100k requests/day
  d1_rows_read: 5_000_000, // D1: 5M rows read/day
  d1_rows_written: 100_000, // D1: 100k rows written/day
  kv_reads: 100_000, // KV: 100k reads/day
  kv_writes: 1_000, // KV: 1k writes/day
  do_requests: 100_000, // Durable Objects: 100k requests/day
  ai_neurons: 10_000, // Workers AI: 10k neurons/day
  external_calls: 50_000 // Self-imposed politeness cap for free public APIs (OSM, Open-Meteo, Wikipedia)
};

export const METRICS: MetricName[] = Object.keys(CLOUDFLARE_FREE_TIER_DAILY) as MetricName[];

export interface BudgetConfig {
  projectShare: number; // 0..1 - portion of the account limits this project may use
  tenantCapacity: number; // number of tenant slices the project budget is divided into
  systemReserve: number; // 0..1 - portion of the project budget held back for un-tenanted traffic
}

export function readBudgetConfig(
  env: Pick<Env, 'PROJECT_SHARE' | 'TENANT_CAPACITY' | 'SYSTEM_RESERVE'>
): BudgetConfig {
  const share = clamp(parseFloat(env.PROJECT_SHARE ?? '0.4'), 0.01, 1);
  const rawCapacity = Math.floor(parseFloat(env.TENANT_CAPACITY ?? '25'));
  const capacity = rawCapacity > 0 ? rawCapacity : 25;
  const reserve = clamp(parseFloat(env.SYSTEM_RESERVE ?? '0.1'), 0, 0.9);
  return { projectShare: share, tenantCapacity: capacity, systemReserve: reserve };
}

/** Daily budget for the whole project = account limit x PROJECT_SHARE. */
export function projectBudget(cfg: BudgetConfig): Record<MetricName, number> {
  return mapMetrics((m) => Math.floor(CLOUDFLARE_FREE_TIER_DAILY[m] * cfg.projectShare));
}

/** Daily allowance for ONE tenant = (project budget - system reserve) / tenant capacity. */
export function tenantAllowance(cfg: BudgetConfig): Record<MetricName, number> {
  const budget = projectBudget(cfg);
  return mapMetrics((m) =>
    Math.max(1, Math.floor((budget[m] * (1 - cfg.systemReserve)) / cfg.tenantCapacity))
  );
}

export function mapMetrics(fn: (m: MetricName) => number): Record<MetricName, number> {
  const out = {} as Record<MetricName, number>;
  for (const m of METRICS) out[m] = fn(m);
  return out;
}

export function emptyMetrics(): Record<MetricName, number> {
  return mapMetrics(() => 0);
}

export function addMetrics(a: Record<MetricName, number>, b: MetricBag): Record<MetricName, number> {
  return mapMetrics((m) => (a[m] ?? 0) + (b[m] ?? 0));
}

/** UTC day key, e.g. 2026-09-12. All quotas reset at 00:00 UTC like Cloudflare's own. */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcMidnight(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/**
 * Rough Workers AI neuron estimate for a text model call. Derived from the
 * published per-token price for the Llama 3.1 8B class (~0.026 neurons per
 * input token, ~0.075 per output token) with a 4-chars-per-token heuristic.
 * We deliberately round UP so the quota is conservative.
 */
export function estimateNeurons(inputChars: number, outputChars: number, model = ''): number {
  const inTok = inputChars / 4;
  const outTok = outputChars / 4;
  const big = /70b|72b|405b/i.test(model);
  const inRate = big ? 0.11 : 0.026;
  const outRate = big ? 0.2 : 0.075;
  return Math.max(1, Math.ceil(inTok * inRate + outTok * outRate));
}

/** Standard cost of common request shapes - what one API call "spends" from the tenant slice. */
export const COST = {
  api: { workers_requests: 1, do_requests: 1 } as MetricBag,
  d1Read: (rows = 1): MetricBag => ({ d1_rows_read: rows }),
  d1Write: (rows = 1): MetricBag => ({ d1_rows_written: rows }),
  external: (calls = 1): MetricBag => ({ external_calls: calls }),
  ai: (neurons: number): MetricBag => ({ ai_neurons: neurons })
};

export function mergeCosts(...bags: MetricBag[]): MetricBag {
  const out: MetricBag = {};
  for (const bag of bags) {
    for (const [k, v] of Object.entries(bag) as [MetricName, number][]) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
