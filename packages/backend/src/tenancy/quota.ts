import type { Context, Next } from 'hono';
import type {
  AssistantCard,
  AssistantMode,
  ChatMessage,
  Conversation,
  Env,
  GeoPoint,
  HonoEnv,
  MetricBag,
  QuotaDecision,
  UsageStatus
} from '../types';
import { COST, mergeCosts } from './limits';

/**
 * Worker-side client for a tenant's Durable Object plus the quota middleware.
 * Every authenticated API route calls `spend()` (via `quotaMiddleware`) before
 * doing work; expensive routes additionally pre-reserve AI neurons / external
 * calls and reconcile afterwards with `adjust()`.
 */
export class TenantClient {
  constructor(
    private env: Env,
    public readonly tenantId: string
  ) {}

  private stub() {
    return this.env.TENANT.get(this.env.TENANT.idFromName(this.tenantId));
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    headers.set('x-tenant-id', this.tenantId);
    const res = await this.stub().fetch(`https://tenant${path}`, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tenant DO ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.call<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  init() {
    return this.post<{ ok: true }>('/init', {});
  }

  consume(metrics: MetricBag): Promise<QuotaDecision> {
    return this.post<QuotaDecision>('/quota/consume', { metrics });
  }

  adjust(metrics: MetricBag): Promise<{ ok: true }> {
    return this.post<{ ok: true }>('/quota/adjust', { metrics });
  }

  usage(): Promise<UsageStatus> {
    return this.call<UsageStatus>('/quota/usage');
  }

  listConversations(): Promise<Conversation[]> {
    return this.call<Conversation[]>('/conversations');
  }

  getConversation(id: string): Promise<Conversation | null> {
    return this.call<Conversation>(`/conversations/${encodeURIComponent(id)}`).catch(() => null);
  }

  createConversation(title: string, mode: AssistantMode): Promise<Conversation> {
    return this.post<Conversation>('/conversations', { title, mode });
  }

  renameConversation(id: string, title: string): Promise<Conversation> {
    return this.call<Conversation>(`/conversations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title })
    });
  }

  deleteConversation(id: string): Promise<{ ok: true }> {
    return this.call<{ ok: true }>(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  messages(conversationId: string, limit = 200): Promise<ChatMessage[]> {
    return this.call<ChatMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`);
  }

  appendMessage(
    conversationId: string,
    role: ChatMessage['role'],
    content: string,
    cards: AssistantCard[] | null = null
  ): Promise<ChatMessage> {
    return this.post<ChatMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      role,
      content,
      cards
    });
  }

  setLocation(loc: GeoPoint & { accuracy_m?: number }): Promise<{ ok: true }> {
    return this.post<{ ok: true }>('/location', loc);
  }

  location(): Promise<(GeoPoint & { accuracy_m?: number; at: string }) | null> {
    return this.call<(GeoPoint & { accuracy_m?: number; at: string }) | null>('/location');
  }
}

export function tenantClient(c: Context<HonoEnv>): TenantClient {
  const tenantId = c.get('tenantId') ?? c.get('user')?.tenantId;
  if (!tenantId) throw new Error('No tenant in context');
  return new TenantClient(c.env, tenantId);
}

/**
 * Charge the tenant for a request. Returns a 429 with Retry-After when the
 * tenant slice or the project-wide budget is exhausted.
 */
export function quotaMiddleware(extra: MetricBag = {}) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const user = c.get('user');
    if (!user?.tenantId) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    c.set('tenantId', user.tenantId);
    const client = new TenantClient(c.env, user.tenantId);
    let decision: QuotaDecision;
    try {
      decision = await client.consume(mergeCosts(COST.api, extra));
    } catch (err) {
      console.error('quota check failed', err);
      // Fail open for availability but log loudly; the ledger will catch up on the next flush.
      await next();
      return;
    }
    if (!decision.allowed) {
      const retry = Math.max(1, Math.ceil((new Date(decision.reset_at).getTime() - Date.now()) / 1000));
      c.header('Retry-After', String(retry));
      return c.json(
        {
          success: false,
          error: decision.reason ?? 'Daily quota exceeded',
          quota: decision
        },
        429
      );
    }
    c.header('X-Quota-Reset', decision.reset_at);
    await next();
  };
}
