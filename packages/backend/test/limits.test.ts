import { describe, it, expect } from 'vitest';
import {
  CLOUDFLARE_FREE_TIER_DAILY,
  estimateNeurons,
  mergeCosts,
  nextUtcMidnight,
  projectBudget,
  readBudgetConfig,
  tenantAllowance,
  utcDay
} from '../src/tenancy/limits';

describe('budget model (40% of the Cloudflare free tier)', () => {
  const cfg = readBudgetConfig({ PROJECT_SHARE: '0.40', TENANT_CAPACITY: '25', SYSTEM_RESERVE: '0.10' });

  it('project budget is exactly 40% of each account limit', () => {
    const b = projectBudget(cfg);
    expect(b.workers_requests).toBe(40_000);
    expect(b.ai_neurons).toBe(4_000);
    expect(b.kv_writes).toBe(400);
    expect(b.d1_rows_read).toBe(CLOUDFLARE_FREE_TIER_DAILY.d1_rows_read * 0.4);
  });

  it('tenant allowance = (budget - 10% reserve) / capacity', () => {
    const a = tenantAllowance(cfg);
    // 40_000 * 0.9 / 25 = 1440
    expect(a.workers_requests).toBe(1440);
    // 4_000 * 0.9 / 25 = 144
    expect(a.ai_neurons).toBe(144);
    // never below 1 even for tiny budgets
    expect(a.kv_writes).toBeGreaterThanOrEqual(1);
  });

  it('falls back to sane defaults on garbage config', () => {
    const c = readBudgetConfig({ PROJECT_SHARE: 'abc', TENANT_CAPACITY: '-3', SYSTEM_RESERVE: '5' });
    expect(c.projectShare).toBe(0.01);
    expect(c.tenantCapacity).toBe(25);
    expect(c.systemReserve).toBe(0.9);
  });

  it('total of all tenant slices never exceeds the project budget', () => {
    const b = projectBudget(cfg);
    const a = tenantAllowance(cfg);
    for (const k of Object.keys(b) as (keyof typeof b)[]) {
      expect(a[k] * cfg.tenantCapacity).toBeLessThanOrEqual(b[k]);
    }
  });
});

describe('neuron estimate', () => {
  it('rounds up and grows with size', () => {
    expect(estimateNeurons(0, 0)).toBe(1);
    const small = estimateNeurons(1000, 400);
    const big = estimateNeurons(4000, 1600);
    expect(big).toBeGreaterThan(small);
    expect(estimateNeurons(4000, 1600, '@cf/meta/llama-3.3-70b-instruct-fp8-fast')).toBeGreaterThan(big);
  });
});

describe('cost helpers & time', () => {
  it('merges metric bags', () => {
    expect(mergeCosts({ workers_requests: 1 }, { workers_requests: 2, ai_neurons: 5 })).toEqual({ workers_requests: 3, ai_neurons: 5 });
  });

  it('utc day + midnight reset', () => {
    const now = new Date('2026-09-12T15:04:05Z');
    expect(utcDay(now)).toBe('2026-09-12');
    expect(nextUtcMidnight(now).toISOString()).toBe('2026-09-13T00:00:00.000Z');
  });
});
