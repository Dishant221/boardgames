# Grand Tour - Product & Architecture Spec

**Project Scope:** Itinerary planner, destination guide and local AI travel assistant (chat + voice "call" mode) that guides a traveller on the ground: where to go, how to get there, what to eat, where to stay, what's on, how to stay safe - with booking and search hand-offs to the user's preferred sites.
**Domain:** not yet registered; runs on `*.workers.dev` (Worker names keep the historical `boardgames-*` identifiers).
**Budget Constraint:** Cloudflare Free Tier only, and this project may use **at most 40%** of the account's free-tier limits (shared account).
**Architecture:** Multi-tenant. One tenant per user; each tenant gets its own Durable Object (compute + SQLite storage) and row-scoped D1 data. See `docs/MULTI_TENANCY.md`.

> This document is the *intended* state. `BACKLOG.md` tracks what is actually built.

---

## 1. PRODUCT OVERVIEW

### Vision
A concierge that feels like a friend who lives in the city: grounded in live local data, never inventing prices or opening hours, and honest about hand-offs ("book it on Booking.com, here is the search with your dates").

### Core experiences
1. **Local AI assistant** - chat and *call* (voice) modes. Understands intent (food, sights, directions, transport, stays, flights, events, safety, shopping, weather, itinerary), resolves *where* (place named > live GPS > home city), fetches real data, answers concisely, and shows cards (places, weather, route, background, links).
2. **Explore** - map of what is around you in 17 categories (sights, museums, food, cafés, nightlife, stays, transit, pharmacy, hospital, ATM, groceries, shopping, nature, venues, Wi-Fi, toilets, police) plus Wikipedia landmarks ("what is this building?").
3. **Destination guide** - one-page briefing: background, forecast, essentials (currency, languages, dialling code, driving side, emergency numbers, plugs/voltage), phrase kit, top sights, eats, transit hubs, live events, booking & search links.
4. **Itineraries** - trips → days → stops; AI auto-plan from real POIs and the forecast; walking legs between stops on the map; manual edit/reorder; place lookup when adding a stop.
5. **Bookings** - intent forms (flights, stays, tickets & tours, trains & buses, tables, shopping, web search) that open pre-filled searches on the user's preferred engine and the major booking sites. No paid booking APIs, no commissions.
6. **Events** - live listings (Ticketmaster when configured) + venues nearby + listing sites.
7. **Settings & usage** - preferences and a transparent quota dashboard (tenant slice + project-wide 40%).

### Design language
"The Grand Tour": a museum gallery wall. Warm plaster and Carrara-marble textures, gilt frames, museum placards, Cinzel / Cormorant Garamond / Inter typography, terracotta + Venetian red + gold + lapis accents. Public-domain paintings of Rome, Venice, Florence, Paris and wider Europe (Panini, Canaletto, Turner, Piranesi, Raphael, Michelangelo, Vermeer, Caillebotte, Van Gogh…) from Wikimedia Commons hang on every page; a destination gets a fitting painting automatically. Call mode switches to a dark museum-red wall with a glowing orb.

---

## 2. TECHNOLOGY STACK

### Frontend (`packages/frontend`)
- React 18 + TypeScript, Vite, Tailwind CSS, Zustand, React Router, Framer Motion (available), lucide-react icons.
- Leaflet + OpenStreetMap tiles (free) for maps.
- Web Speech API (SpeechRecognition + speechSynthesis) for call mode - runs in the browser, zero backend cost.
- Deployed as a Cloudflare Worker with static assets (`[assets]`, SPA fallback).

### Backend (`packages/backend`)
- Cloudflare Workers + Hono 4 (app built once at module scope), Wrangler 4.
- **D1** for relational, tenant-scoped data. **Durable Objects (SQLite)**: `TenantAgent` per tenant, `ProjectLedger` singleton. **Workers AI** default LLM (`@cf/meta/llama-3.1-8b-instruct-fast`, configurable). **Workers Cache API** for all upstream responses. **KV** only for the hourly project usage snapshot.
- Optional secrets: `ANTHROPIC_API_KEY` (Claude Opus 5 via `@anthropic-ai/sdk`, moves LLM load off the neuron budget), `GOOGLE_MAPS_API_KEY` (Places API New), `TICKETMASTER_API_KEY`.
- Auth: custom JWT (`@tsndr/cloudflare-worker-jwt`), bcrypt password hashing. JWT carries `tenantId`.

### Free / open data providers (no keys)
Nominatim (geocoding), Overpass (POIs), OSRM (routing), Open-Meteo (weather), Wikivoyage & Wikipedia REST (background, geosearch), static country/emergency/plug/phrase tables. Google Maps is used only via key-less deep links unless a Places key is configured.

### Version control & CI
- GitHub `Dishant221/boardgames`; branches `main` (production) and `testing` (staging); GitHub Actions lint → type-check → test → build → **D1 migrate** → deploy backend → build+deploy frontend.

---

## 3. MULTI-TENANCY & BUDGET (summary; details in `docs/MULTI_TENANCY.md`)

- Account free-tier limits × `PROJECT_SHARE` (0.40) = project daily budget, tracked by `ProjectLedger`.
- Minus `SYSTEM_RESERVE` (0.10), divided by `TENANT_CAPACITY` (25) = per-tenant daily allowance, tracked by each `TenantAgent`.
- Every authenticated request passes `quotaMiddleware`; refusals are `429` with `Retry-After` until 00:00 UTC.
- AI calls pre-reserve neurons and reconcile; weather questions skip the LLM entirely; all upstream responses are cached.
- Tenant isolation: private DO per tenant (conversations, counters, location) + `tenant_id` on every D1 row and in every query.

---

## 4. ASSISTANT PIPELINE

```
message ─▶ detectIntent (regex, free)
        ─▶ resolve focus: place in message (Nominatim) > live GPS (reverse geocode) > home city
        ─▶ gather in parallel: weather · POIs for intent · Wikivoyage/Wikipedia · walking route (directions)
        ─▶ linksForIntent(preferred engine, booking sites, Google Maps)
        ─▶ LLM (Workers AI | Claude) with FACTS block; call mode = 2-4 spoken sentences
        ─▶ reply + cards → stored in the tenant's DO; TTS in the browser for call mode
```
Rules: never invent hours/prices/addresses; if facts are missing say what to check and rely on the link cards; chat replies use light markdown, call replies none.

---

## 5. SECURITY

- JWT validation on every request; tokens without a tenant are rejected (forces re-login → tenant provisioned).
- Hono `secureHeaders` (CSP `default-src 'none'`, no-referrer, frame-ancestors none) and a strict CORS allow-list.
- Parameterised D1 queries only; all tenant data filtered by `tenant_id`.
- Live location is stored only in the user's own DO and only when the browser shares it.
- No API keys in the frontend; optional provider keys are Worker secrets.
- Per-tenant + project-wide quotas double as abuse protection for authenticated traffic. TODO: per-IP rate limit on auth endpoints.

---

## 6. DATABASE (D1, migration `002_travel_pivot.sql`)

`tenants`, `user_preferences`, `saved_places`, `trips`, `trip_days`, `trip_stops` (all with `tenant_id` and indexes). `users` from 001 is reused; the old game tables remain unused.

Per-tenant DO SQLite: `meta`, `usage(day, metric, amount)`, `pending_flush`, `conversations`, `messages`. Project ledger DO: `usage`.

---

## 7. DEPLOYMENT

```
feature/* → push → CI: lint/type/test/build → deploy testing (also on `testing`)
testing   → PR → main → CI → deploy production
```
Deploy steps per environment: `wrangler d1 migrations apply <db> --env <env> --remote` → `wrangler deploy --env <env>` (backend; DO migration `v1` creates `TenantAgent`/`ProjectLedger`) → `vite build` with `VITE_API_URL` → `wrangler deploy --env <env>` (frontend).

Secrets: `wrangler secret put JWT_SECRET --env production` (+ testing); optional `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `TICKETMASTER_API_KEY`.

Local: `npm run dev` (Vite on 5173 + `wrangler dev` on 8787). Apply local migrations once: `cd packages/backend && npm run db:migrate:local`. Workers AI needs `wrangler dev` without `--local` (remote binding) - otherwise the assistant uses its rules fallback.

---

## 8. ROADMAP

- Phase 1 (now): everything in §1 - shipped in code, pending first deploy after the pivot.
- Phase 2: streaming replies, Wikivoyage sections, offline/PWA itinerary + guide, share/export (ICS, PDF, link), currency conversion, per-IP rate limiting, route tests with mocked bindings.
- Phase 3: group trips (cross-tenant sharing), translation in call mode, email verification/password reset, OAuth, accessibility & SEO passes, ADRs, OpenAPI.

---

**Document Version:** 2.0
**Last Updated:** 2026-09-12
**Status:** Implemented as MVP; see `BACKLOG.md`
