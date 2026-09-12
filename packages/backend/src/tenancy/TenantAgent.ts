import { DurableObject } from 'cloudflare:workers';
import type {
  AssistantCard,
  AssistantMode,
  ChatMessage,
  Conversation,
  Env,
  GeoPoint,
  MetricBag,
  MetricName,
  ProjectUsage,
  QuotaDecision,
  UsageStatus
} from '../types';
import {
  METRICS,
  addMetrics,
  emptyMetrics,
  nextUtcMidnight,
  readBudgetConfig,
  tenantAllowance,
  utcDay
} from './limits';

/**
 * TenantAgent - ONE Durable Object per tenant (= per user). It is the tenant's
 * private resource: nothing in here is shared with any other tenant.
 *
 *  - Quota: daily counters per metric, checked against the tenant's slice of the
 *    project budget. Usage is flushed to the ProjectLedger in batches (every
 *    FLUSH_THRESHOLD units or on a 60s alarm) so the project-wide 40% ceiling is
 *    enforced without doubling DO request counts.
 *  - Conversations + messages for the AI assistant (chat and call modes).
 *  - Last known location shared by the browser (for "near me" answers).
 *
 * Storage: SQLite-backed (required on the Workers Free plan).
 */
export class TenantAgent extends DurableObject<Env> {
  private ready = false;
  private static FLUSH_THRESHOLD = 25;

  private init() {
    if (this.ready) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage (
        day TEXT NOT NULL,
        metric TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, metric)
      );
      CREATE TABLE IF NOT EXISTS pending_flush (metric TEXT PRIMARY KEY, amount INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'chat',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        cards TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    `);
    this.ready = true;
  }

  async fetch(request: Request): Promise<Response> {
    this.init();
    const url = new URL(request.url);
    const path = url.pathname;
    const tenantHeader = request.headers.get('x-tenant-id');
    if (tenantHeader && this.getMeta('tenant_id') !== tenantHeader) this.setMeta('tenant_id', tenantHeader);
    try {
      // ------------------------------------------------------------ quota
      if (request.method === 'POST' && path === '/quota/consume') {
        const body = (await request.json()) as { metrics: MetricBag };
        return json(this.consume(body.metrics ?? {}));
      }
      if (request.method === 'POST' && path === '/quota/adjust') {
        const body = (await request.json()) as { metrics: MetricBag };
        this.apply(body.metrics ?? {});
        return json({ ok: true });
      }
      if (path === '/quota/usage') {
        const project = await this.projectStatus();
        return json(this.usage(project));
      }

      // ------------------------------------------------------ conversations
      if (path === '/conversations' && request.method === 'GET') {
        return json(this.listConversations());
      }
      if (path === '/conversations' && request.method === 'POST') {
        const body = (await request.json()) as { title?: string; mode?: AssistantMode };
        return json(this.createConversation(body.title ?? 'New conversation', body.mode ?? 'chat'));
      }
      const convMatch = path.match(/^\/conversations\/([^/]+)(\/messages)?$/);
      if (convMatch) {
        const id = decodeURIComponent(convMatch[1]);
        if (request.method === 'DELETE') {
          this.ctx.storage.sql.exec('DELETE FROM messages WHERE conversation_id = ?', id);
          this.ctx.storage.sql.exec('DELETE FROM conversations WHERE id = ?', id);
          return json({ ok: true });
        }
        if (convMatch[2] && request.method === 'POST') {
          const body = (await request.json()) as {
            role: ChatMessage['role'];
            content: string;
            cards?: AssistantCard[] | null;
          };
          return json(this.appendMessage(id, body.role, body.content, body.cards ?? null));
        }
        if (convMatch[2] && request.method === 'GET') {
          const limit = Number(url.searchParams.get('limit') ?? 200);
          return json(this.messages(id, limit));
        }
        if (request.method === 'GET') {
          const conv = this.getConversation(id);
          return conv ? json(conv) : json({ error: 'not found' }, 404);
        }
        if (request.method === 'PATCH') {
          const body = (await request.json()) as { title?: string };
          if (body.title) {
            this.ctx.storage.sql.exec(
              'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
              body.title.slice(0, 120),
              new Date().toISOString(),
              id
            );
          }
          return json(this.getConversation(id));
        }
      }

      // ----------------------------------------------------------- location
      if (path === '/location' && request.method === 'POST') {
        const body = (await request.json()) as GeoPoint & { accuracy_m?: number };
        this.setMeta('location', JSON.stringify({ ...body, at: new Date().toISOString() }));
        return json({ ok: true });
      }
      if (path === '/location') {
        const raw = this.getMeta('location');
        return json(raw ? JSON.parse(raw) : null);
      }

      if (path === '/init' && request.method === 'POST') {
        this.setMeta('created_at', this.getMeta('created_at') ?? new Date().toISOString());
        return json({ ok: true });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      return json({ error: (err as Error).message }, 500);
    }
  }

  // ------------------------------------------------------------------ quota

  private allowance(): Record<MetricName, number> {
    return tenantAllowance(readBudgetConfig(this.env));
  }

  private usedToday(): Record<MetricName, number> {
    const day = utcDay();
    const rows = this.ctx.storage.sql
      .exec<{ metric: string; amount: number }>('SELECT metric, amount FROM usage WHERE day = ?', day)
      .toArray();
    let used = emptyMetrics();
    for (const r of rows) used = addMetrics(used, { [r.metric as MetricName]: r.amount });
    return used;
  }

  private consume(metrics: MetricBag): QuotaDecision {
    const allowance = this.allowance();
    const used = this.usedToday();
    const resetAt = nextUtcMidnight().toISOString();

    // Project-wide brake: if the ledger told us a metric is exhausted, refuse.
    const exhausted = this.exhaustedFromLedger();
    for (const [metric, amount] of Object.entries(metrics) as [MetricName, number][]) {
      if (!amount) continue;
      if (exhausted.includes(metric)) {
        return {
          allowed: false,
          reason: `Project-wide daily budget for ${metric} is exhausted (40% share of the Cloudflare free tier). Resets at 00:00 UTC.`,
          metric,
          remaining: remaining(allowance, used),
          reset_at: resetAt
        };
      }
      if (used[metric] + amount > allowance[metric]) {
        return {
          allowed: false,
          reason: `Your daily ${metric.replace(/_/g, ' ')} allowance is used up. Resets at 00:00 UTC.`,
          metric,
          remaining: remaining(allowance, used),
          reset_at: resetAt
        };
      }
    }

    this.apply(metrics);
    return { allowed: true, remaining: remaining(allowance, addMetrics(used, metrics)), reset_at: resetAt };
  }

  private apply(metrics: MetricBag) {
    const day = utcDay();
    let pendingTotal = 0;
    for (const [metric, amount] of Object.entries(metrics) as [MetricName, number][]) {
      if (!amount) continue;
      const amt = Math.round(amount);
      this.ctx.storage.sql.exec(
        `INSERT INTO usage (day, metric, amount) VALUES (?, ?, ?)
         ON CONFLICT(day, metric) DO UPDATE SET amount = MAX(0, amount + excluded.amount)`,
        day,
        metric,
        amt
      );
      this.ctx.storage.sql.exec(
        `INSERT INTO pending_flush (metric, amount) VALUES (?, ?)
         ON CONFLICT(metric) DO UPDATE SET amount = amount + excluded.amount`,
        metric,
        amt
      );
    }
    const pending = this.ctx.storage.sql
      .exec<{ total: number | null }>('SELECT SUM(ABS(amount)) AS total FROM pending_flush')
      .one();
    pendingTotal = pending?.total ?? 0;
    if (pendingTotal >= TenantAgent.FLUSH_THRESHOLD) {
      void this.flush();
    } else if (pendingTotal > 0) {
      void this.ensureAlarm();
    }
  }

  private async ensureAlarm() {
    const current = await this.ctx.storage.getAlarm();
    if (current === null) await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }

  async alarm(): Promise<void> {
    this.init();
    await this.flush();
    // Retain 14 days of usage history.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.ctx.storage.sql.exec('DELETE FROM usage WHERE day < ?', cutoff);
  }

  private async flush() {
    const rows = this.ctx.storage.sql
      .exec<{ metric: string; amount: number }>('SELECT metric, amount FROM pending_flush WHERE amount != 0')
      .toArray();
    if (rows.length === 0) return;
    const metrics: MetricBag = {};
    for (const r of rows) metrics[r.metric as MetricName] = r.amount;
    this.ctx.storage.sql.exec('DELETE FROM pending_flush');
    try {
      const ledger = this.env.PROJECT_LEDGER.get(this.env.PROJECT_LEDGER.idFromName('project'));
      const res = await ledger.fetch('https://ledger/consume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
      if (res.ok) {
        const status = (await res.json()) as ProjectUsage;
        this.setMeta('project_status', JSON.stringify({ ...status, fetched_at: Date.now() }));
      }
    } catch {
      // Put the amounts back so they are retried on the next flush.
      for (const r of rows) {
        this.ctx.storage.sql.exec(
          `INSERT INTO pending_flush (metric, amount) VALUES (?, ?)
           ON CONFLICT(metric) DO UPDATE SET amount = amount + excluded.amount`,
          r.metric,
          r.amount
        );
      }
      await this.ensureAlarm();
    }
  }

  private exhaustedFromLedger(): MetricName[] {
    const raw = this.getMeta('project_status');
    if (!raw) return [];
    const status = JSON.parse(raw) as ProjectUsage & { fetched_at: number };
    if (status.day !== utcDay()) return [];
    return status.exhausted ?? [];
  }

  private async projectStatus(): Promise<ProjectUsage | null> {
    const raw = this.getMeta('project_status');
    const cached = raw ? (JSON.parse(raw) as ProjectUsage & { fetched_at: number }) : null;
    if (cached && cached.day === utcDay() && Date.now() - cached.fetched_at < 5 * 60_000) {
      return cached;
    }
    try {
      const ledger = this.env.PROJECT_LEDGER.get(this.env.PROJECT_LEDGER.idFromName('project'));
      const res = await ledger.fetch('https://ledger/status');
      if (!res.ok) return cached;
      const status = (await res.json()) as ProjectUsage;
      this.setMeta('project_status', JSON.stringify({ ...status, fetched_at: Date.now() }));
      return status;
    } catch {
      return cached;
    }
  }

  private usage(project: ProjectUsage | null): UsageStatus {
    return {
      tenant_id: this.getMeta('tenant_id') ?? 'unknown',
      day: utcDay(),
      reset_at: nextUtcMidnight().toISOString(),
      allowance: this.allowance(),
      used: this.usedToday(),
      project
    };
  }

  // ---------------------------------------------------------- conversations

  private listConversations(): Conversation[] {
    return this.ctx.storage.sql
      .exec(
        `SELECT c.id, c.title, c.mode, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c ORDER BY c.updated_at DESC LIMIT 100`
      )
      .toArray() as unknown as Conversation[];
  }

  private getConversation(id: string): Conversation | null {
    const rows = this.ctx.storage.sql
      .exec(
        `SELECT c.id, c.title, c.mode, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c WHERE c.id = ?`,
        id
      )
      .toArray() as unknown as Conversation[];
    return rows[0] ?? null;
  }

  private createConversation(title: string, mode: AssistantMode): Conversation {
    const now = new Date().toISOString();
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.ctx.storage.sql.exec(
      'INSERT INTO conversations (id, title, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id,
      title.slice(0, 120),
      mode,
      now,
      now
    );
    return { id, title, mode, created_at: now, updated_at: now, message_count: 0 };
  }

  private appendMessage(
    conversationId: string,
    role: ChatMessage['role'],
    content: string,
    cards: AssistantCard[] | null
  ): ChatMessage {
    const now = new Date().toISOString();
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.ctx.storage.sql.exec(
      'INSERT INTO messages (id, conversation_id, role, content, cards, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      id,
      conversationId,
      role,
      content,
      cards ? JSON.stringify(cards) : null,
      now
    );
    this.ctx.storage.sql.exec('UPDATE conversations SET updated_at = ? WHERE id = ?', now, conversationId);
    // Cap history per conversation to keep the per-tenant store small.
    this.ctx.storage.sql.exec(
      `DELETE FROM messages WHERE conversation_id = ? AND id NOT IN (
         SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 400)`,
      conversationId,
      conversationId
    );
    return { id, conversation_id: conversationId, role, content, cards, created_at: now };
  }

  private messages(conversationId: string, limit: number): ChatMessage[] {
    const rows = this.ctx.storage.sql
      .exec<{
        id: string;
        conversation_id: string;
        role: ChatMessage['role'];
        content: string;
        cards: string | null;
        created_at: string;
      }>(
        'SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC',
        conversationId,
        Math.min(Math.max(1, limit), 400)
      )
      .toArray();
    return rows.map((r) => ({ ...r, cards: r.cards ? (JSON.parse(r.cards) as AssistantCard[]) : null }));
  }

  // ------------------------------------------------------------------- meta

  private getMeta(key: string): string | null {
    const rows = this.ctx.storage.sql
      .exec<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)
      .toArray();
    return rows[0]?.value ?? null;
  }

  private setMeta(key: string, value: string) {
    this.ctx.storage.sql.exec(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value
    );
  }
}

function remaining(
  allowance: Record<MetricName, number>,
  used: Record<MetricName, number>
): Record<MetricName, number> {
  const out = {} as Record<MetricName, number>;
  for (const m of METRICS) out[m] = Math.max(0, allowance[m] - (used[m] ?? 0));
  return out;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
