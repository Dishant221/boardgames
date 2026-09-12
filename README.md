# Grand Tour

🧭 Itinerary planner, destination guide and **local AI travel assistant** you can chat with or *call*. Grounded in free open data (OpenStreetMap, Wikivoyage, Open-Meteo), dressed as a gallery of Rome and Europe, and built to live inside 40% of a Cloudflare free-tier account with a private workspace per user.

> Repository and Cloudflare resources keep their historical `boardgames` names; the product inside is Grand Tour. See `BACKLOG.md` for the pivot note.

## What it does

- **Assistant (chat + call)** - "best gelato near me", "how do I get to the station?", "plan my afternoon", "cheap flights to Rome next weekend". Detects intent, resolves where you are, fetches real places/weather/routes, answers briefly and shows cards. Call mode uses the browser's speech recognition and voice.
- **Explore** - map of what is around you in 17 categories + Wikipedia landmarks.
- **Guide** - one-page destination briefing: background, forecast, currency, emergency numbers, plugs, phrases, sights, eats, transit, events, booking links.
- **Itineraries** - trips → days → stops, AI auto-plan from real POIs and the forecast, walking legs on the map.
- **Bookings** - flights, stays, tickets, trains, tables, shopping: pre-filled searches on your preferred engine and the major booking sites. No paid APIs.
- **Events** - venues nearby and live listings (Ticketmaster optional).
- **Settings** - preferences and a transparent usage dashboard.

## Stack

React 18 + Vite + Tailwind + Leaflet · Cloudflare Workers (Hono) + D1 + Durable Objects (SQLite) + Workers AI + Cache API · optional Anthropic Claude, Google Places, Ticketmaster.

```
packages/
├── frontend/   React app, deployed as a Worker with static assets
└── backend/    Hono API Worker, TenantAgent + ProjectLedger Durable Objects, D1 migrations
docs/
├── MULTI_TENANCY.md   the 40% budget model and tenant isolation
├── API.md             endpoint reference
├── INFRASTRUCTURE.md, CLOUDFLARE_SETUP.md, SECURITY.md
INSTRUCTIONS.md        product & architecture spec
BACKLOG.md             what is built vs pending
```

## Quick start

```bash
npm install && (cd packages/frontend && npm install) && (cd packages/backend && npm install)
cd packages/backend && npm run db:migrate:local && cd ../..
npm run dev            # Vite :5173 + wrangler dev :8787
```

Sign up in the app (each signup provisions a tenant + its Durable Object). The assistant uses Workers AI, which needs `wrangler dev` in remote mode (drop `--local`) or an `ANTHROPIC_API_KEY`; otherwise it answers from data with a rules fallback.

Tests / checks: `npm run test`, `npm run type-check`, `npm run lint`.

## Deploy

CI (`.github/workflows/ci-cd.yml`) runs on `testing` and `main`: applies D1 migrations, deploys the backend (creating the Durable Objects), builds the frontend with the right `VITE_API_URL` and deploys it.

Secrets per environment (`wrangler secret put NAME --env testing|production`): `JWT_SECRET` (required), `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `TICKETMASTER_API_KEY` (optional).

Live URLs (workers.dev): backend `boardgames-prod` / `boardgames-testing`, frontend `boardgames-frontend-prod` / `boardgames-frontend-testing` on the `sarkkarijobseva` subdomain.

## Budget & tenancy in one paragraph

Account free-tier limits × 0.40 = project budget (tracked by a `ProjectLedger` Durable Object). Minus a 10% system reserve, divided by `TENANT_CAPACITY` (25) = each user's daily allowance, tracked in their own `TenantAgent` Durable Object. Requests beyond either limit get `429` until 00:00 UTC. All upstream API responses are cached in the Workers Cache API so repeat questions are free. Details: `docs/MULTI_TENANCY.md`.

## License

MIT. Paintings are public-domain works served from Wikimedia Commons; map data © OpenStreetMap contributors.
