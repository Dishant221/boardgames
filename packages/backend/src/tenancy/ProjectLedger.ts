import { DurableObject } from 'cloudflare:workers';
import type { Env, MetricBag, MetricName, ProjectUsage } from '../types';
import { METRICS, addMetrics, emptyMetrics, projectBudget, readBudgetConfig, utcDay } from './limits';

/**
 * ProjectLedger - a single Durable Object (id derived from the name "project")
 * that tracks the WHOLE project's consumption against the 40% share of the
 * Cloudflare account limits. Tenant agents flush their usage here in batches,
 * so even if every tenant is individually under its slice, the project as a
 * whole can never exceed PROJECT_SHARE.
 *
 * Storage: SQLite (free plan). One row per (day, metric).
 * Side effect: once an hour it writes a compact usage snapshot to KV so the
 * dashboard can be served without touching the DO (1 KV write/hour = 24/day,
 * well inside the 400 writes/day this project may use).
 */
export class ProjectLedger extends DurableObject<Env> {
  private ready = false;

  private init() {
    if (this.ready) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        day TEXT NOT NULL,
        metric TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, metric)
      );
    `);
    this.ready = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.init();
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/consume') {
        const body = (await request.json()) as { metrics: MetricBag };
        const status = this.record(body.metrics ?? {});
        return json(status);
      }
      if (url.pathname === '/status') {
        return json(this.status());
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      return json({ error: (err as Error).message }, 500);
    }
  }

  private record(metrics: MetricBag): ProjectUsage {
    const day = utcDay();
    for (const [metric, amount] of Object.entries(metrics) as [MetricName, number][]) {
      if (!amount) continue;
      this.ctx.storage.sql.exec(
        `INSERT INTO usage (day, metric, amount) VALUES (?, ?, ?)
         ON CONFLICT(day, metric) DO UPDATE SET amount = amount + excluded.amount`,
        day,
        metric,
        Math.round(amount)
      );
    }
    void this.scheduleSnapshot();
    return this.status();
  }

  private status(): ProjectUsage {
    const day = utcDay();
    const rows = this.ctx.storage.sql
      .exec<{ metric: string; amount: number }>('SELECT metric, amount FROM usage WHERE day = ?', day)
      .toArray();
    let used = emptyMetrics();
    for (const r of rows) used = addMetrics(used, { [r.metric as MetricName]: r.amount });
    const budget = projectBudget(readBudgetConfig(this.env));
    const exhausted = METRICS.filter((m) => used[m] >= budget[m]);
    return { day, budget, used, exhausted };
  }

  private async scheduleSnapshot() {
    const current = await this.ctx.storage.getAlarm();
    if (current === null) {
      await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }
  }

  async alarm(): Promise<void> {
    this.init();
    const status = this.status();
    try {
      await this.env.CACHE.put(`project:usage:${status.day}`, JSON.stringify(status), {
        expirationTtl: 60 * 60 * 24 * 7
      });
    } catch {
      // KV is best-effort; the DO remains the source of truth.
    }
    // Keep 14 days of history, then prune.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.ctx.storage.sql.exec('DELETE FROM usage WHERE day < ?', cutoff);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
