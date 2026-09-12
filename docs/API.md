# Grand Tour API

Base URL: `https://boardgames-prod.sarkkarijobseva.workers.dev/api` (production) · `https://boardgames-testing.sarkkarijobseva.workers.dev/api` (testing) · `http://localhost:8787/api` (dev).

All responses: `{ success: boolean, data?, error?, meta? }`. Authenticated routes need `Authorization: Bearer <jwt>`; the JWT carries `tenantId`. Quota refusals return `429` with `Retry-After` and a `quota` object.

## Health
- `GET /health` - environment, AI provider, effective budget numbers, enabled integrations.

## Auth (`/auth`)
- `POST /signup` `{ email, username, password, home_city? }` → `{ token, user, tenant }` (provisions tenant + Durable Object).
- `POST /login` `{ email, password }` → `{ token, user, tenant }`.
- `GET /me` → user + `tenant` + `preferences`.

## Preferences (`/preferences`)
- `GET /` → preferences.
- `PUT /` `{ home_city_query?, search_engine?, units?, language?, currency?, interests?, voice_enabled? }` → updated preferences (home city is geocoded).
- `POST /location` `{ lat, lng, accuracy_m? }` - store live position in the tenant DO.

## Places (`/places`) - OpenStreetMap, free
- `GET /categories`
- `GET /search?q=&limit=` - forward geocode (Nominatim).
- `GET /reverse?lat=&lng=`
- `GET /nearby?lat=&lng=&category=&radius=&limit=` - POIs (Overpass). Categories: sights, museums, food, cafes, nightlife, hotels, transport, pharmacy, hospital, atm, supermarket, shopping, nature, events, wifi, toilets, police.
- `GET /find?q=&lat=&lng=` - free-text nearby search (Google Places when key set, else OSM).
- `GET /landmarks?lat=&lng=&radius=` - Wikipedia articles with coordinates nearby.
- `GET /directions?from=lat,lng&to=lat,lng&mode=foot|bike|car` - OSRM route + Google Maps deep links.
- `GET /saved` · `POST /saved` `{ name, category, lat, lng, address?, source?, source_id?, tags?, notes? }` · `DELETE /saved/:id`

## Guide (`/guide`)
- `GET /?q=Rome` or `GET /?lat=&lng=` → background (Wikivoyage/Wikipedia), weather, essentials (currency, languages, dialling code, driving side, emergency numbers, plugs), phrases, sights, food, transit, live events (if Ticketmaster key), booking/search links, `art_keyword`.

## Trips (`/trips`)
- `GET /` · `POST /` `{ destination, title?, start_date?, end_date?, notes? }` (geocodes; creates one day per date) · `GET /:id` · `PATCH /:id` · `DELETE /:id`
- `POST /:id/days` · `PATCH /:id/days/:dayId` · `DELETE /:id/days/:dayId`
- `POST /:id/days/:dayId/stops` `{ name, kind, lat?, lng?, address?, start_time?, end_time?, notes?, booking_url? }` · `PATCH /:id/stops/:stopId` · `DELETE /:id/stops/:stopId`
- `POST /:id/reorder` `[{ stop_id, day_id, position }]`
- `GET /:id/days/:dayId/legs` - walking legs between consecutive stops.
- `POST /:id/autoplan` - AI itinerary from real POIs + forecast (replaces days). Spends AI neurons.

## Assistant (`/assistant`)
- `GET /conversations` · `POST /conversations` · `GET /conversations/:id` (with messages) · `DELETE /conversations/:id`
- `POST /chat` `{ message, conversation_id?, mode: 'chat'|'call', location?: {lat,lng}, trip_id? }` → `{ conversation_id, message, reply, intent, provider, usage }`. `reply.cards` contains structured cards: `places`, `weather`, `links`, `route`, `guide`.

## Discover (`/discover`)
- `GET /weather?lat=&lng=&days=` (Open-Meteo)
- `GET /events?lat=&lng=&q=&radius_km=` - live listings (Ticketmaster if configured) + venues (OSM) + listing links.
- `POST /bookings/suggest` `{ kind: flights|hotels|activities|transport|food|shopping|search, destination?, origin?, depart?, return?, checkin?, checkout?, adults?, topic?, keywords?, lat?, lng? }` → deep links pre-filled for the user's preferred search engine and the main booking sites, plus tips. Never calls a paid API.
- `GET /resolve?q=` - quick geocode.
- `GET /usage` - tenant + project quota status.

## Data providers
| Need | Provider | Key? |
|---|---|---|
| Geocoding | Nominatim (OSM) | no |
| POIs | Overpass (OSM) | no |
| Routing | OSRM demo server | no |
| Weather | Open-Meteo | no |
| Background | Wikivoyage / Wikipedia REST | no |
| Country essentials | Static country tables (src/data/countries.ts) | no |
| LLM | Workers AI (default) or Anthropic Claude | optional `ANTHROPIC_API_KEY` |
| Richer POIs | Google Places (New) | optional `GOOGLE_MAPS_API_KEY` |
| Live events | Ticketmaster Discovery | optional `TICKETMASTER_API_KEY` |
| Booking/search deep links | Google/Bing/DuckDuckGo/Brave/Ecosia, Google Maps, Google Flights, Skyscanner, Kayak, Booking.com, Airbnb, Hostelworld, GetYourGuide, Viator, Tiqets, Eventbrite, Ticketmaster, Meetup, Songkick, Rome2Rio, Omio, Trainline, FlixBus, TheFork, Tripadvisor | no |
