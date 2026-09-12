import { Hono } from 'hono';
import type { HonoEnv, Trip, TripStop } from '../types';
import {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  addDay,
  updateDay,
  deleteDay,
  clearDays,
  addStop,
  updateStop,
  deleteStop,
  getPreferences
} from '../utils/db';
import { geocode, cityLabel } from '../providers/nominatim';
import { quotaMiddleware, tenantClient } from '../tenancy/quota';
import { COST, estimateNeurons } from '../tenancy/limits';
import { planTrip, countDays } from '../ai/planner';
import { route } from '../providers/osrm';

const STOP_KINDS = ['sight', 'food', 'hotel', 'transport', 'flight', 'activity', 'event', 'note'];

export function createTripsRouter() {
  const router = new Hono<HonoEnv>();

  router.get('/', quotaMiddleware(COST.d1Read(20)), async (c) => {
    const user = c.get('user')!;
    return c.json({ success: true, data: await listTrips(c.env.DB, user.tenantId, user.userId) });
  });

  router.post('/', quotaMiddleware(COST.d1Write(4)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as Partial<Trip> & { destination: string; title?: string };
    if (!body.destination) return c.json({ success: false, error: 'destination required' }, 400);

    let dest = { lat: body.dest_lat ?? null, lng: body.dest_lng ?? null, cc: body.country_code ?? null, label: body.destination };
    if (dest.lat === null || dest.lng === null) {
      const geo = (await geocode(c.env, body.destination, 1).catch(() => []))[0];
      if (geo) dest = { lat: geo.lat, lng: geo.lng, cc: geo.country_code ?? null, label: cityLabel(geo) };
    }

    const trip = await createTrip(c.env.DB, user.tenantId, user.userId, {
      title: body.title || `Trip to ${dest.label}`,
      destination: dest.label,
      dest_lat: dest.lat,
      dest_lng: dest.lng,
      country_code: dest.cc,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      notes: body.notes ?? null,
      cover_art: body.cover_art ?? null,
      status: body.status
    });

    // Pre-create one day per date so the itinerary editor has structure.
    const n = Math.min(14, countDays(trip.start_date, trip.end_date) || 1);
    for (let i = 0; i < n; i++) {
      const date = trip.start_date ? addDays(trip.start_date, i) : null;
      await addDay(c.env.DB, user.tenantId, trip.id, i + 1, date, `Day ${i + 1}`, null);
    }
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, trip.id) }, 201);
  });

  router.get('/:id', quotaMiddleware(COST.d1Read(30)), async (c) => {
    const user = c.get('user')!;
    const trip = await getTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    return trip ? c.json({ success: true, data: trip }) : c.json({ success: false, error: 'Trip not found' }, 404);
  });

  router.patch('/:id', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const patch = (await c.req.json()) as Partial<Trip>;
    if (patch.destination && (patch.dest_lat === undefined || patch.dest_lng === undefined)) {
      const geo = (await geocode(c.env, patch.destination, 1).catch(() => []))[0];
      if (geo) {
        patch.dest_lat = geo.lat;
        patch.dest_lng = geo.lng;
        patch.country_code = geo.country_code ?? null;
        patch.destination = cityLabel(geo);
      }
    }
    await updateTrip(c.env.DB, user.tenantId, c.req.param('id')!, patch);
    const trip = await getTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    return trip ? c.json({ success: true, data: trip }) : c.json({ success: false, error: 'Trip not found' }, 404);
  });

  router.delete('/:id', quotaMiddleware(COST.d1Write(10)), async (c) => {
    const user = c.get('user')!;
    const ok = await deleteTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    return ok ? c.json({ success: true }) : c.json({ success: false, error: 'Trip not found' }, 404);
  });

  // ---------------------------------------------------------------- days
  router.post('/:id/days', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const trip = await getTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    if (!trip) return c.json({ success: false, error: 'Trip not found' }, 404);
    const body = (await c.req.json().catch(() => ({}))) as { title?: string; date?: string; notes?: string };
    const idx = trip.days.length + 1;
    const day = await addDay(c.env.DB, user.tenantId, trip.id, idx, body.date ?? (trip.start_date ? addDays(trip.start_date, idx - 1) : null), body.title ?? `Day ${idx}`, body.notes ?? null);
    return c.json({ success: true, data: { ...day, stops: [] } }, 201);
  });

  router.patch('/:id/days/:dayId', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const patch = (await c.req.json()) as { title?: string; date?: string; notes?: string; day_index?: number };
    await updateDay(c.env.DB, user.tenantId, c.req.param('dayId')!, patch);
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, c.req.param('id')!) });
  });

  router.delete('/:id/days/:dayId', quotaMiddleware(COST.d1Write(5)), async (c) => {
    const user = c.get('user')!;
    await deleteDay(c.env.DB, user.tenantId, c.req.param('dayId')!);
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, c.req.param('id')!) });
  });

  // --------------------------------------------------------------- stops
  router.post('/:id/days/:dayId/stops', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as Partial<TripStop> & { name: string; kind?: TripStop['kind'] };
    if (!body.name) return c.json({ success: false, error: 'name required' }, 400);
    const kind = body.kind && STOP_KINDS.includes(body.kind) ? body.kind : 'sight';
    const stop = await addStop(c.env.DB, user.tenantId, c.req.param('id')!, c.req.param('dayId')!, { ...body, kind });
    return c.json({ success: true, data: stop }, 201);
  });

  router.patch('/:id/stops/:stopId', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    const patch = (await c.req.json()) as Partial<TripStop>;
    if (patch.kind && !STOP_KINDS.includes(patch.kind)) delete patch.kind;
    await updateStop(c.env.DB, user.tenantId, c.req.param('stopId')!, patch);
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, c.req.param('id')!) });
  });

  router.delete('/:id/stops/:stopId', quotaMiddleware(COST.d1Write(1)), async (c) => {
    const user = c.get('user')!;
    await deleteStop(c.env.DB, user.tenantId, c.req.param('stopId')!);
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, c.req.param('id')!) });
  });

  /** Reorder stops within/between days: body = [{stop_id, day_id, position}] */
  router.post('/:id/reorder', quotaMiddleware(COST.d1Write(10)), async (c) => {
    const user = c.get('user')!;
    const body = (await c.req.json()) as { stop_id: string; day_id: string; position: number }[];
    for (const s of body.slice(0, 100)) {
      await updateStop(c.env.DB, user.tenantId, s.stop_id, { day_id: s.day_id, position: s.position });
    }
    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, c.req.param('id')!) });
  });

  /** Legs between consecutive stops of a day (walking), for the day map. */
  router.get('/:id/days/:dayId/legs', quotaMiddleware(COST.external(4)), async (c) => {
    const user = c.get('user')!;
    const trip = await getTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    const day = trip?.days.find((d) => d.id === c.req.param('dayId')!);
    if (!trip || !day) return c.json({ success: false, error: 'Not found' }, 404);
    const located = day.stops.filter((s) => s.lat !== null && s.lng !== null);
    const legs = [];
    for (let i = 0; i < located.length - 1 && i < 8; i++) {
      const a = located[i];
      const b = located[i + 1];
      const r = await route(c.env, { lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }, 'foot').catch(() => null);
      legs.push({ from: a.id, to: b.id, route: r });
    }
    return c.json({ success: true, data: legs });
  });

  /** AI auto-plan: replaces the trip's days with a generated itinerary. */
  router.post('/:id/autoplan', quotaMiddleware(COST.external(6)), async (c) => {
    const user = c.get('user')!;
    const trip = await getTrip(c.env.DB, user.tenantId, c.req.param('id')!);
    if (!trip) return c.json({ success: false, error: 'Trip not found' }, 404);
    if (trip.dest_lat === null || trip.dest_lng === null) return c.json({ success: false, error: 'Trip destination has no coordinates' }, 400);

    const tenant = tenantClient(c);
    // Reserve neurons up-front (generous estimate), reconcile after.
    const reserve = c.env.ANTHROPIC_API_KEY ? 0 : estimateNeurons(6000, 3000, c.env.AI_MODEL);
    if (reserve) {
      const decision = await tenant.consume({ ai_neurons: reserve });
      if (!decision.allowed) return c.json({ success: false, error: decision.reason, quota: decision }, 429);
    }

    const prefs = await getPreferences(c.env.DB, user.tenantId, user.userId);
    const plan = await planTrip(c.env, trip, prefs);
    if (reserve) await tenant.adjust({ ai_neurons: plan.neurons - reserve }).catch(() => undefined);

    await clearDays(c.env.DB, user.tenantId, trip.id);
    let writes = 0;
    for (const d of plan.days) {
      const date = trip.start_date ? addDays(trip.start_date, d.day_index - 1) : null;
      const day = await addDay(c.env.DB, user.tenantId, trip.id, d.day_index, date, d.title, d.notes);
      writes++;
      for (const s of d.stops) {
        await addStop(c.env.DB, user.tenantId, trip.id, day.id, { ...s, address: s.address ?? undefined, lat: s.lat ?? undefined, lng: s.lng ?? undefined, start_time: s.start_time ?? undefined, end_time: s.end_time ?? undefined, notes: s.notes ?? undefined, source: s.source ?? undefined });
        writes++;
      }
    }
    await tenant.adjust({ d1_rows_written: writes }).catch(() => undefined);

    return c.json({ success: true, data: await getTrip(c.env.DB, user.tenantId, trip.id), meta: { provider: plan.provider, neurons: plan.neurons } });
  });

  return router;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
