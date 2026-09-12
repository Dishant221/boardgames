import { Hono } from 'hono';
import type { ChatRequest, ChatResponse, HonoEnv } from '../types';
import { quotaMiddleware, tenantClient } from '../tenancy/quota';
import { COST, estimateNeurons } from '../tenancy/limits';
import { getPreferences, getTrip } from '../utils/db';
import { answer } from '../ai/assistant';
import { aiProviderName } from '../ai/provider';

/**
 * AI assistant routes. Conversations and messages live in the tenant's own
 * Durable Object; the Worker only orchestrates. "Call" mode is the same
 * endpoint with mode=call: shorter, speakable replies the browser reads aloud.
 */
export function createAssistantRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/conversations', quotaMiddleware(), async (c) => {
    return c.json({ success: true, data: await tenantClient(c).listConversations() });
  });

  router.post('/conversations', quotaMiddleware(), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { title?: string; mode?: 'chat' | 'call' };
    return c.json({ success: true, data: await tenantClient(c).createConversation(body.title ?? 'New conversation', body.mode ?? 'chat') }, 201);
  });

  router.get('/conversations/:id', quotaMiddleware(), async (c) => {
    const client = tenantClient(c);
    const conv = await client.getConversation(c.req.param('id')!);
    if (!conv) return c.json({ success: false, error: 'Conversation not found' }, 404);
    const messages = await client.messages(conv.id);
    return c.json({ success: true, data: { ...conv, messages } });
  });

  router.delete('/conversations/:id', quotaMiddleware(), async (c) => {
    await tenantClient(c).deleteConversation(c.req.param('id')!);
    return c.json({ success: true });
  });

  router.post('/chat', quotaMiddleware(COST.external(3)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as ChatRequest;
    const text = (body.message ?? '').trim();
    if (!text) return c.json({ success: false, error: 'message required' }, 400);
    if (text.length > 2000) return c.json({ success: false, error: 'message too long (max 2000 chars)' }, 400);
    const mode = body.mode === 'call' ? 'call' : 'chat';

    const tenant = tenantClient(c);

    // Reserve AI budget before doing work (Workers AI only; Claude does not use neurons).
    const usesNeurons = aiProviderName(c.env) === 'workers-ai';
    const reserve = usesNeurons ? estimateNeurons(3500, mode === 'call' ? 600 : 1800, c.env.AI_MODEL) : 0;
    if (reserve) {
      const decision = await tenant.consume({ ai_neurons: reserve });
      if (!decision.allowed) {
        c.header('Retry-After', String(Math.max(1, Math.ceil((new Date(decision.reset_at).getTime() - Date.now()) / 1000))));
        return c.json({ success: false, error: decision.reason, quota: decision }, 429);
      }
    }

    // Conversation bookkeeping (in the tenant DO).
    let conv = body.conversation_id ? await tenant.getConversation(body.conversation_id) : null;
    if (!conv) conv = await tenant.createConversation(text.slice(0, 60), mode);
    const history = await tenant.messages(conv.id, 12);
    if (conv.message_count === 0) await tenant.renameConversation(conv.id, text.slice(0, 60)).catch(() => undefined);

    if (body.location && typeof body.location.lat === 'number' && typeof body.location.lng === 'number') {
      await tenant.setLocation(body.location).catch(() => undefined);
    }
    const location = body.location ?? (await tenant.location().catch(() => null)) ?? undefined;

    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    let tripSummary: string | undefined;
    if (body.trip_id) {
      const trip = await getTrip(c.env.DB, user.tenantId, body.trip_id);
      if (trip) {
        tripSummary = `${trip.title} to ${trip.destination}${trip.start_date ? ` (${trip.start_date} → ${trip.end_date ?? '?'})` : ''}; ${trip.days.length} days, stops: ${trip.days
          .flatMap((d) => d.stops.map((s) => s.name))
          .slice(0, 20)
          .join(', ')}`;
      }
    }

    const userMsg = await tenant.appendMessage(conv.id, 'user', text);
    const turn = await answer(
      { env: c.env, prefs, mode, location: location ? { lat: location.lat, lng: location.lng } : undefined, history, tripSummary },
      text
    );
    const replyMsg = await tenant.appendMessage(conv.id, 'assistant', turn.reply, turn.cards);

    // Reconcile the reservation with the real cost.
    const delta: Record<string, number> = {};
    if (reserve) delta.ai_neurons = turn.neurons - reserve;
    if (turn.externalCalls > 3) delta.external_calls = turn.externalCalls - 3;
    if (Object.keys(delta).length) await tenant.adjust(delta).catch(() => undefined);

    const response: ChatResponse = {
      conversation_id: conv.id,
      message: userMsg,
      reply: replyMsg,
      intent: turn.intent,
      provider: `${turn.provider}${turn.model !== 'none' ? `:${turn.model}` : ''}`,
      usage: { ai_neurons: turn.neurons }
    };
    return c.json({ success: true, data: response });
  });

  return router;
}
