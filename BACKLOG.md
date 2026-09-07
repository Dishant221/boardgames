# BoardGamesEpic - Backlog

**Last Updated:** 2026-09-07
**Purpose:** Tracks what's actually built vs. what's still pending. See `INSTRUCTIONS.md` for the full product/architecture spec this backlog is scoped against.

---

## Monopoly Game Status: 🔴 Not Playable Yet

What exists today is **lobby/session management only** — there is no actual Monopoly gameplay.

**Built:**
- Create a game session, join a session (up to 4 players, color assignment)
- Session state persisted in D1 (`game_sessions` table) as JSON
- Board initialized with 40 empty properties (`owner: null, houses: 0, hotels: 0, mortgaged: false`) and each player starts with $1500
- Frontend lobby (Dashboard) lists open sessions and lets you create/join one
- Frontend Game page shows the player list, their money, and status

**NOT built (i.e., you cannot actually play):**
- No dice rolling endpoint or logic
- No turn/move logic (advancing a player around the board)
- No property purchase, rent collection, or mortgage logic
- No Chance/Community Chest card system (arrays exist in the schema, always empty)
- No jail logic
- No win condition / bankruptcy handling
- The "Start Game" button on the Game page has no handler — it does nothing when clicked
- The board itself is a placeholder div that says "Game board rendering coming soon" — no visual board, no tokens, no property tiles
- No real-time sync between players (see Durable Objects below) — two players in the same session would each need to manually refresh to see any change, and there's no change to see yet anyway

---

## Pending Work

### High priority — needed before Monopoly is playable at all
- [ ] **Game engine**: turn cycle (roll → move → buy/pass/mortgage → next player), implemented server-side (client must not be trusted with dice results or money)
- [ ] **Durable Objects for real-time multiplayer** — `wrangler.toml` has no Durable Objects binding right now (removed during the Sept 2026 deploy fixes because the `GameSession` class it referenced was never implemented). Needs: a `GameSession` DO class, WebSocket handling, migration entry in `wrangler.toml`, and a way for the frontend to open a WS connection per session.
- [ ] **Monopoly board UI** — replace the placeholder with an actual rendered board (Canvas or Pixi.js per `INSTRUCTIONS.md`), property tiles, player tokens, dice animation
- [ ] Wire the "Start Game" button to actually transition `status: waiting → playing` and kick off the first turn
- [ ] Card system: fill in the 17 Chance + 17 Community Chest cards and their effects

### Medium priority — infrastructure/ops gaps
- [ ] **R2 not enabled** — requires a one-time manual click-through in the Cloudflare dashboard (no API/CLI workaround exists). Needed before any asset upload (sprites, sounds, 3D models) can work. Once enabled, re-add the R2 bucket bindings to `packages/backend/wrangler.toml` (removed during the Sept 2026 fixes) and `packages/frontend` if it ends up serving assets too.
- [ ] **Custom domain** — `boardgamesepic.com` is not registered/added as a zone on the Cloudflare account (`sarkkarijobseva@gmail.com`, 0 zones exist). Everything currently runs on `*.workers.dev` URLs. Once the domain is added as a zone, re-add `routes` to both `packages/backend/wrangler.toml` and `packages/frontend/wrangler.toml`.
- [ ] Dev environment D1 database / KV namespace — only `testing` and `production` were provisioned; local `wrangler dev` has no bound resources yet
- [ ] Tests — Vitest is configured in both packages but zero actual test files exist (`--passWithNoTests` is what's keeping CI green)
- [ ] Rate limiting (mentioned in `INSTRUCTIONS.md` security section, not implemented)
- [ ] CSP / security headers on responses
- [ ] Upgrade Wrangler in the backend package too (it's still pinned to `^3.26.0`; frontend is on `^4.6.0`) — keeping both on the same major version would avoid the Node-version mismatch class of bug we just fixed

### Feature gaps vs. `INSTRUCTIONS.md`
- [ ] Password reset / email verification (Cloudflare Email Routing — nothing wired up)
- [ ] 2FA (optional per spec)
- [ ] OAuth2 (GitHub/Google) login
- [ ] Player stats page / leaderboard UI (backend has the DB tables and a `getLeaderboard` query helper, but no route exposes it and no frontend page shows it)
- [ ] Sound design / background music (Howler.js per spec — nothing added)
- [ ] Animations beyond basic Tailwind transitions (dice roll, token movement, victory celebration — all listed in spec, none built)
- [ ] SEO: meta tags, Open Graph, sitemap.xml, robots.txt, structured data
- [ ] Accessibility audit (WCAG 2.1 AA target per spec)
- [ ] GDPR/CCPA data controls, Terms of Service, Privacy Policy content
- [ ] Game assets — no sprites, tokens, dice images, property card art exist yet

### Documentation gaps (listed as required in `INSTRUCTIONS.md` section 13)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Game Rules document (Monopoly rules + house rules + edge cases)
- [ ] Architecture Decision Records (ADRs)
- [ ] Contributing guidelines

---

## Known Debt / Things to Revisit
- `packages/backend/src/index.ts` rebuilds the entire Hono app (new instance, all middleware, all routes) on **every single request** inside the `fetch()` handler, instead of constructing it once at module scope. Works correctly, just wasteful — worth refactoring once the request volume matters.
- Backend and frontend are on different major Wrangler versions (3.x vs 4.x) purely by accident of when each was pinned — see infra gap above.
