import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../types';
import { estimateNeurons } from '../tenancy/limits';

/**
 * LLM provider abstraction.
 *
 *  - Default: Cloudflare Workers AI (free tier, 10k neurons/day account-wide;
 *    this project uses at most 40% of that). Model set by AI_MODEL var.
 *  - Optional: Anthropic Claude when ANTHROPIC_API_KEY is configured as a secret.
 *    Claude costs nothing from the Cloudflare neuron budget, so a tenant on the
 *    Claude path only spends Workers/DO requests.
 */
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  provider: 'workers-ai' | 'anthropic';
  model: string;
  neurons: number; // Workers AI neurons consumed (0 for Anthropic)
}

export interface LlmOptions {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  json?: boolean;
}

export function aiProviderName(env: Env): 'workers-ai' | 'anthropic' {
  return env.ANTHROPIC_API_KEY ? 'anthropic' : 'workers-ai';
}

export async function generate(env: Env, opts: LlmOptions): Promise<LlmResult> {
  if (env.ANTHROPIC_API_KEY) return generateAnthropic(env, opts);
  return generateWorkersAi(env, opts);
}

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

async function generateWorkersAi(env: Env, opts: LlmOptions): Promise<LlmResult> {
  const model = env.AI_MODEL || DEFAULT_MODEL;
  const messages = [{ role: 'system', content: opts.system }, ...opts.messages];
  const inputs: Record<string, unknown> = {
    messages,
    max_tokens: opts.maxTokens ?? 700,
    temperature: 0.4
  };
  if (opts.json) inputs.response_format = { type: 'json_object' };
  const raw = (await env.AI.run(model, inputs)) as { response?: string; result?: { response?: string } } | string;
  const text = typeof raw === 'string' ? raw : (raw.response ?? raw.result?.response ?? '');
  const inputChars = messages.reduce((n, m) => n + m.content.length, 0);
  return {
    text: text.trim(),
    provider: 'workers-ai',
    model,
    neurons: estimateNeurons(inputChars, text.length, model)
  };
}

async function generateAnthropic(env: Env, opts: LlmOptions): Promise<LlmResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  // Short, deliberately-bounded travel replies: the assistant speaks in a few
  // paragraphs (or a couple of sentences in call mode), so a low cap is intended.
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: opts.maxTokens ?? 1024,
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low' },
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content }))
  });
  if (response.stop_reason === 'refusal') {
    return { text: 'I can’t help with that request.', provider: 'anthropic', model: response.model, neurons: 0 };
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return { text, provider: 'anthropic', model: response.model, neurons: 0 };
}

/** Best-effort extraction of the first JSON object/array from model output. */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  for (let end = candidate.length; end > start; end--) {
    const ch = candidate[end - 1];
    if (ch !== '}' && ch !== ']') continue;
    try {
      return JSON.parse(candidate.slice(start, end)) as T;
    } catch {
      // keep shrinking
    }
  }
  return null;
}
