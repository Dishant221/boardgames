# Multi-tenancy & the 40% budget

Grand Tour runs on a single Cloudflare account on the **Workers Free plan**. That account is shared with other projects, so this project is allowed to consume **at most 40%** of every free-tier limit. The tenancy layer enforces that automatically and fairly across users.

## Model

```
Cloudflare account limits (free tier, per day)
└── × PROJECT_SHARE (0.40)  → project budget          (ProjectLedger DO, one per deployment)
    ├── × SYSTEM_RESERVE (0.10) → held back for login/signup/health/errors
    └── remainder ÷ TENANT_CAPACITY (25) → per-tenant daily allowance (TenantAgent DO, one per user)
```

- **Tenant = user.** Signup creates a `tenants` row in D1 and a private `TenantAgent` Durable Object (SQLite-backed). Login lazily provisions one for pre-pivot accounts. The tenant id travels in the JWT.
- **Every tenant gets new resources.** The Durable Object holds that tenant's quota counters, assistant conversations/messages and last known location. Nothing in it is shared. D1 rows (`trips`, `trip_days`, `trip_stops`, `saved_places`, `user_preferences`) all carry `tenant_id` and every query filters on it.
- **Two brakes.** A request is refused with `429 Too Many Requests` + `Retry-After` when either (a) the tenant's own daily slice is used up, or (b) the project-wide ledger reports the metric is exhausted. Both reset at 00:00 UTC, the same time as Cloudflare's own counters.

## Metrics and defaults

| Metric | Account free-tier (per day) | Project budget (40%) | Per-tenant allowance (25 tenants, 10% reserve) |
|---|---|---|---|
| `workers_requests` | 100,000 | 40,000 | 1,440 |
| `do_requests` | 100,000 | 40,000 | 1,440 |
| `d1_rows_read` | 5,000,000 | 2,000,000 | 72,000 |
| `d1_rows_written` | 100,000 | 40,000 | 1,440 |
| `kv_reads` | 100,000 | 40,000 | 1,440 |
| `kv_writes` | 1,000 | 400 | 14 |
| `ai_neurons` | 10,000 | 4,000 | 144 |
| `external_calls` (self-imposed) | 50,000 | 20,000 | 720 |

Source of truth: `packages/backend/src/tenancy/limits.ts`. Adjust with Worker vars `PROJECT_SHARE`, `TENANT_CAPACITY`, `SYSTEM_RESERVE` in `wrangler.toml` - no code change needed. `GET /health` prints the effective numbers.

### What a request costs

| Action | Charged |
|---|---|
| Any authenticated API call | 1 `workers_requests` + 1 `do_requests` |
| D1 read/write | rows read/written (estimated per route) |
| Map/weather/wiki lookup | `external_calls` (1 per upstream call; cached responses are free) |
| Assistant chat (Workers AI) | pre-reserves an `ai_neurons` estimate, reconciles with the real estimate afterwards |
| Assistant chat (Anthropic configured) | 0 neurons - Claude usage is billed to the Anthropic key, not Cloudflare |
| Trip auto-plan | ~6 external calls + neurons |

Neuron estimates come from the published Workers AI per-token prices for the Llama 3.1 8B class (`estimateNeurons()`); they round up so the quota errs on the safe side. Weather-only questions are answered from data without spending any neurons.

### Why KV writes are barely used

KV allows only 1,000 writes/day on the free tier (400 for this project). All upstream API responses are therefore cached in the **Workers Cache API** (free, unlimited, per-colo) instead of KV. KV is only written by the `ProjectLedger` alarm - one usage snapshot per hour.

## Data flow

```
Browser ──JWT──▶ Worker (Hono)
                  │ quotaMiddleware → TenantAgent.consume()   (per-request)
                  │ route handler   → D1 (tenant_id-scoped) / Cache API / free APIs / Workers AI
                  └ TenantAgent ──batched flush (≥25 units or 60 s alarm)──▶ ProjectLedger
                                                                              └ hourly KV snapshot
```

Flushing in batches keeps the ledger from doubling DO request counts. A tenant learns about project-wide exhaustion from the flush response and refuses further work locally.

## Operational knobs

- Raise `TENANT_CAPACITY` when you expect more daily-active users (each slice gets smaller).
- Lower `PROJECT_SHARE` if another project on the account needs more headroom.
- Set `ANTHROPIC_API_KEY` to move all LLM load off the Cloudflare neuron budget.
- `GET /api/discover/usage` (authenticated) returns the tenant's counters plus the project snapshot; the Settings page renders it.

## Tables touched by tenancy

D1: `tenants`, `user_preferences`, `saved_places`, `trips`, `trip_days`, `trip_stops` (migration `002_travel_pivot.sql`).
TenantAgent SQLite: `meta`, `usage`, `pending_flush`, `conversations`, `messages`.
ProjectLedger SQLite: `usage`.
