# Agent Instructions

Read these files before doing any non-trivial work in this repo:

- **`INSTRUCTIONS.md`** - the product spec and target architecture for **Grand Tour** (itinerary + destination guide + local AI assistant). This is the *intended* end state, not necessarily the current state.
- **`BACKLOG.md`** - what's actually built vs. still pending, kept up to date as work happens. Check here first to avoid re-implementing something that's already done or assuming something works that doesn't.
- **`docs/MULTI_TENANCY.md`** - the 40%-of-free-tier budget model and per-tenant isolation. Any new route must go through `quotaMiddleware` and scope D1 queries by `tenant_id`.
- **`docs/API.md`** - endpoint reference; update it when you add or change routes.

Conventions:
- Worker/D1/KV resource names intentionally keep the historical `boardgames-*` identifiers. Do not rename them.
- Prefer free/open data providers; anything with a key must be optional and gated on an env secret.
- Cache upstream calls with `cachedFetch()` (Workers Cache API), not KV (KV writes are scarce).
- Run `npm run type-check && npm run test && npm run lint` at the repo root before finishing.

When you finish a chunk of work that changes what's built vs. pending, update `BACKLOG.md` to match reality before moving on.
