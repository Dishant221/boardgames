# Grand Tour - Backlog

**Last Updated:** 2026-09-12
**Purpose:** Tracks what's actually built vs. what's still pending. See `INSTRUCTIONS.md` for the product/architecture spec this backlog is scoped against, and `docs/MULTI_TENANCY.md` for the budget model.

> **Pivot note (2026-09-12):** the Monopoly app was replaced by Grand Tour - itinerary, destination guide and local AI assistant. Infrastructure (Cloudflare account, Worker names `boardgames-*`, D1/KV ids, CI/CD, auth) was kept as-is. Old game tables from migration 001 remain in D1, unused.

---

## Status: 🟢 Feature-complete MVP, not yet deployed after the pivot

**Built (backend, `packages/backend`):**
- Multi-tenancy: one tenant per user (`tenants` table + JWT `tenantId`), one private `TenantAgent` Durable Object per tenant (SQLite) for quota counters, conversations, live location; `ProjectLedger` DO enforcing the project-wide 40% share of the free tier; `quotaMiddleware` returning 429 + `Retry-After`. Config via `PROJECT_SHARE`, `TENANT_CAPACITY`, `SYSTEM_RESERVE`.
- Auth: signup/login/me with tenant provisioning (lazy for pre-pivot accounts), stricter validation.
- Preferences: home city (geocoded), preferred search engine, units, language, currency, interests, voice toggle, live location sharing.
- Places: geocode/reverse (Nominatim), nearby POIs in 17 categories (Overpass), free-text find (Google Places optional), Wikipedia landmarks nearby, walking/cycling/driving directions (OSRM), saved places.
- Destination guide: Wikivoyage/Wikipedia summary, 7-day weather, country essentials (currency, languages, dialling code, driving side, emergency numbers, plugs), phrase kit, sights/food/transit, live events (Ticketmaster optional), booking & search deep links, art keyword for the UI.
- Trips: CRUD trips/days/stops, reorder, walking legs per day, **AI auto-plan** grounded in real POIs + forecast with deterministic fallback.
- Assistant: `/assistant/chat` pipeline - regex intent detection → location resolution (mentioned place > live GPS > home) → parallel grounding (weather, POIs, wiki, route) → deep links for the user's engine/booking sites → LLM reply (Workers AI default, Anthropic optional) → structured cards. Weather questions answered without the LLM. Chat and call modes.
- Discover: weather, events (venues + listings), booking-intent suggestions, usage dashboard data.
- Security headers (Hono `secureHeaders`), CORS allow-list, Hono app built once at module scope (old per-request rebuild debt fixed).
- Unit tests (27) for the budget model, intent classifier, deep links, polyline decoding, JSON extraction. Backend upgraded to Wrangler 4 + current workers-types.

**Built (frontend, `packages/frontend`):**
- Gallery-wall design system: plaster/marble textures, gilt frames, Cinzel/Cormorant/Inter, public-domain paintings of Rome, Venice, Florence, Paris etc. from Wikimedia Commons, museum placards.
- Pages: Login, Signup, Atrium (home), Explore (Leaflet map + categories + saved places + Wikipedia landmarks), Guide, Itineraries list + Trip detail (day tabs, stop editor with place lookup, reorder, walking legs on map, AI auto-plan), Assistant (chat + **call mode** with Web Speech recognition/synthesis and an animated orb), Bookings (intent forms → deep links + tips), Events, Settings (preferences + usage meters + project table).
- Browser geolocation store shared across pages; position sent only to the user's own tenant DO.

**Built (ops):**
- `wrangler.toml`: AI binding, two DO bindings + SQLite migration, per-env vars, local dev bindings, `migrations_dir`.
- CI applies D1 migrations before deploying the backend (testing + production).
- Docs: `INSTRUCTIONS.md` (new spec), `docs/MULTI_TENANCY.md`, `docs/API.md`, README.

---

## Pending Work

### High priority - before/at first deploy
- [ ] **Deploy & verify on testing**: push to `testing`, confirm CI applies `002_travel_pivot.sql`, DO migration `v1` succeeds, `/health` shows `ai_provider`, sign up, chat once (Workers AI). Then promote to `main`.
- [ ] **Set secrets** per env: `JWT_SECRET` (already), optional `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `TICKETMASTER_API_KEY` (`wrangler secret put NAME --env testing|production`).
- [ ] Measure real Workers AI neuron usage in the dashboard for a few chats and calibrate `estimateNeurons()` rates (currently derived from list prices, rounded up).
- [ ] Old tokens: users logged in before the pivot get a 401 asking them to log in again (tenant gets provisioned on login). Communicate if there are real users.

### Medium priority
- [ ] Streaming assistant replies (SSE) for snappier chat; call mode would speak sentence-by-sentence.
- [ ] Wikivoyage section extraction (Get in / Get around / Stay safe) instead of only the summary.
- [ ] OSRM demo server is rate-limited; self-host or swap to another free router if directions traffic grows.
- [ ] Tests for routes with a mocked D1/DO (currently only pure-function tests); Vitest workers pool.
- [ ] R2 still not enabled on the account (manual dashboard step) - needed only if we later host our own images/audio.
- [ ] Custom domain still not on the account; everything runs on `*.workers.dev`.
- [ ] Dev D1/KV are local-only placeholders in `wrangler.toml`; fine for `wrangler dev --local`.
- [ ] Rate limiting per IP for unauthenticated auth endpoints (tenant quota covers authenticated traffic).
- [ ] Nominatim policy: 1 req/s - add a tiny per-colo throttle if geocode traffic spikes (cache already 7 days).
- [ ] Overpass occasionally returns empty sets when several queries run concurrently (seen locally for `food` and `events` around Rome while `sights`/`transit` succeeded). Add retry-with-backoff and/or run the guide's POI queries sequentially.

### Feature gaps vs. `INSTRUCTIONS.md`
- [ ] Offline/PWA mode with cached guide + itinerary for roaming without data.
- [ ] Share/export itinerary (ICS calendar, PDF, public read-only link).
- [ ] Group trips (invite another tenant to a trip) - would need cross-tenant ACLs.
- [ ] Currency conversion (frankfurter.app is free) in the guide and stops' cost estimates.
- [ ] Translate-a-menu / live translation in call mode.
- [ ] Password reset / email verification (Cloudflare Email Routing), OAuth login, 2FA.
- [ ] SEO for public pages (landing, guides), accessibility audit (WCAG 2.1 AA), privacy policy & terms.
- [ ] Analytics of intent distribution to tune the classifier and card layouts.

### Documentation gaps
- [ ] OpenAPI spec generated from routes (docs/API.md is hand-written).
- [ ] ADRs: why DO-per-tenant, why Cache API over KV, why deep links over paid booking APIs.
- [ ] Contributing guidelines.

---

## Known Debt / Things to Revisit
- Intent detection is regex-based (fast, free, deterministic). It will misclassify creative phrasing; the LLM still answers correctly because grounding is additive, but cards may be less relevant. Consider a tiny classifier call when neurons allow.
- `TenantAgent` fails **open** if the DO is unreachable (logs loudly). Decide if fail-closed is preferable once traffic is real.
- `estimateNeurons()` is an estimate; Cloudflare's dashboard is the truth.
- Painting URLs are hot-linked from Wikimedia Commons (`Special:FilePath`). Acceptable for public-domain works at this scale; mirror to R2 once R2 is enabled.
- `packages/backend` build via esbuild is only used by CI's artifact step; `wrangler deploy` bundles from source itself.
