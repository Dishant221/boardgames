import type {
  SavedPlace,
  SearchEngine,
  Tenant,
  Trip,
  TripDay,
  TripStop,
  TripWithDays,
  User,
  UserPreferences
} from '../types';
import { newId } from './http';

/**
 * D1 data access. EVERY tenant-scoped query filters by tenant_id (row-level
 * multi-tenancy). Helpers return plain objects; JSON columns are parsed here.
 */

export async function executeQuery<T>(db: D1Database, query: string, params: unknown[] = []): Promise<T[]> {
  const result = await db
    .prepare(query)
    .bind(...params)
    .all<T>();
  return result.results;
}

export async function executeUpdate(db: D1Database, query: string, params: unknown[] = []): Promise<D1Result> {
  return db
    .prepare(query)
    .bind(...params)
    .run();
}

// ------------------------------------------------------------------- users

export async function getUserById(db: D1Database, userId: string) {
  const rows = await executeQuery<Omit<User, 'password_hash'>>(
    db,
    'SELECT id, username, email, avatar_url, created_at, updated_at, last_login, is_active FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserByEmail(db: D1Database, email: string) {
  const rows = await executeQuery<User>(
    db,
    'SELECT id, username, email, password_hash, avatar_url, created_at, updated_at, last_login, is_active FROM users WHERE email = ?',
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function getUserByUsername(db: D1Database, username: string) {
  const rows = await executeQuery<Omit<User, 'password_hash'>>(
    db,
    'SELECT id, username, email, avatar_url, created_at, updated_at, is_active FROM users WHERE username = ?',
    [username]
  );
  return rows[0] ?? null;
}

export async function createUser(db: D1Database, userId: string, email: string, username: string, passwordHash: string) {
  return executeUpdate(
    db,
    'INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
    [userId, email.toLowerCase(), username, passwordHash]
  );
}

export async function touchLastLogin(db: D1Database, userId: string) {
  return executeUpdate(db, 'UPDATE users SET last_login = datetime("now") WHERE id = ?', [userId]);
}

// ----------------------------------------------------------------- tenants

export async function getTenantForUser(db: D1Database, userId: string): Promise<Tenant | null> {
  const rows = await executeQuery<Tenant>(db, 'SELECT * FROM tenants WHERE owner_user_id = ?', [userId]);
  return rows[0] ?? null;
}

export async function createTenant(db: D1Database, userId: string, name: string): Promise<Tenant> {
  const id = newId('tnt');
  await executeUpdate(db, 'INSERT INTO tenants (id, owner_user_id, name, plan, created_at) VALUES (?, ?, ?, "free", datetime("now"))', [
    id,
    userId,
    name.slice(0, 80)
  ]);
  return { id, owner_user_id: userId, name, plan: 'free', created_at: new Date().toISOString() };
}

// ------------------------------------------------------------- preferences

interface PrefRow {
  user_id: string;
  tenant_id: string;
  home_city: string | null;
  home_lat: number | null;
  home_lng: number | null;
  search_engine: SearchEngine;
  units: 'metric' | 'imperial';
  language: string;
  currency: string;
  interests: string | null;
  voice_enabled: number;
  updated_at: string;
}

export function defaultPreferences(userId: string, tenantId: string): UserPreferences {
  return {
    user_id: userId,
    tenant_id: tenantId,
    home_city: null,
    home_lat: null,
    home_lng: null,
    search_engine: 'google',
    units: 'metric',
    language: 'en',
    currency: 'EUR',
    interests: [],
    voice_enabled: true,
    updated_at: new Date().toISOString()
  };
}

export async function getPreferences(db: D1Database, tenantId: string, userId: string): Promise<UserPreferences> {
  const rows = await executeQuery<PrefRow>(db, 'SELECT * FROM user_preferences WHERE tenant_id = ? AND user_id = ?', [tenantId, userId]);
  const r = rows[0];
  if (!r) return defaultPreferences(userId, tenantId);
  return {
    ...r,
    interests: r.interests ? (JSON.parse(r.interests) as string[]) : [],
    voice_enabled: r.voice_enabled === 1
  };
}

export async function upsertPreferences(db: D1Database, prefs: UserPreferences): Promise<void> {
  await executeUpdate(
    db,
    `INSERT INTO user_preferences (user_id, tenant_id, home_city, home_lat, home_lng, search_engine, units, language, currency, interests, voice_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))
     ON CONFLICT(user_id) DO UPDATE SET
       home_city = excluded.home_city, home_lat = excluded.home_lat, home_lng = excluded.home_lng,
       search_engine = excluded.search_engine, units = excluded.units, language = excluded.language,
       currency = excluded.currency, interests = excluded.interests, voice_enabled = excluded.voice_enabled,
       updated_at = datetime("now")`,
    [
      prefs.user_id,
      prefs.tenant_id,
      prefs.home_city,
      prefs.home_lat,
      prefs.home_lng,
      prefs.search_engine,
      prefs.units,
      prefs.language,
      prefs.currency,
      JSON.stringify(prefs.interests ?? []),
      prefs.voice_enabled ? 1 : 0
    ]
  );
}

// ------------------------------------------------------------ saved places

interface SavedPlaceRow {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  source: SavedPlace['source'];
  source_id: string | null;
  tags: string | null;
  notes: string | null;
  created_at: string;
}

function toSavedPlace(r: SavedPlaceRow): SavedPlace {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    user_id: r.user_id,
    name: r.name,
    category: r.category,
    lat: r.lat,
    lng: r.lng,
    address: r.address ?? undefined,
    source: r.source,
    source_id: r.source_id ?? undefined,
    tags: r.tags ? (JSON.parse(r.tags) as Record<string, string>) : undefined,
    notes: r.notes,
    created_at: r.created_at
  };
}

export async function listSavedPlaces(db: D1Database, tenantId: string, userId: string): Promise<SavedPlace[]> {
  const rows = await executeQuery<SavedPlaceRow>(db, 'SELECT * FROM saved_places WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 500', [
    tenantId,
    userId
  ]);
  return rows.map(toSavedPlace);
}

export async function savePlace(
  db: D1Database,
  tenantId: string,
  userId: string,
  p: { name: string; category: string; lat: number; lng: number; address?: string; source?: SavedPlace['source']; source_id?: string; tags?: Record<string, string>; notes?: string }
): Promise<SavedPlace> {
  const id = newId('plc');
  await executeUpdate(
    db,
    `INSERT INTO saved_places (id, tenant_id, user_id, name, category, lat, lng, address, source, source_id, tags, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
    [id, tenantId, userId, p.name.slice(0, 200), p.category.slice(0, 40), p.lat, p.lng, p.address ?? null, p.source ?? 'user', p.source_id ?? null, p.tags ? JSON.stringify(p.tags) : null, p.notes ?? null]
  );
  const rows = await executeQuery<SavedPlaceRow>(db, 'SELECT * FROM saved_places WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  return toSavedPlace(rows[0]);
}

export async function deleteSavedPlace(db: D1Database, tenantId: string, userId: string, id: string): Promise<boolean> {
  const res = await executeUpdate(db, 'DELETE FROM saved_places WHERE id = ? AND tenant_id = ? AND user_id = ?', [id, tenantId, userId]);
  return (res.meta.changes ?? 0) > 0;
}

// ------------------------------------------------------------------- trips

export async function listTrips(db: D1Database, tenantId: string, userId: string): Promise<Trip[]> {
  return executeQuery<Trip>(db, 'SELECT * FROM trips WHERE tenant_id = ? AND user_id = ? ORDER BY COALESCE(start_date, created_at) DESC LIMIT 200', [tenantId, userId]);
}

export async function getTrip(db: D1Database, tenantId: string, tripId: string): Promise<TripWithDays | null> {
  const trips = await executeQuery<Trip>(db, 'SELECT * FROM trips WHERE id = ? AND tenant_id = ?', [tripId, tenantId]);
  const trip = trips[0];
  if (!trip) return null;
  const days = await executeQuery<TripDay>(db, 'SELECT * FROM trip_days WHERE trip_id = ? AND tenant_id = ? ORDER BY day_index ASC', [tripId, tenantId]);
  const stops = await executeQuery<TripStop>(db, 'SELECT * FROM trip_stops WHERE trip_id = ? AND tenant_id = ? ORDER BY position ASC', [tripId, tenantId]);
  return {
    ...trip,
    days: days.map((d) => ({ ...d, stops: stops.filter((s) => s.day_id === d.id) }))
  };
}

export async function createTrip(
  db: D1Database,
  tenantId: string,
  userId: string,
  t: Pick<Trip, 'title' | 'destination'> & Partial<Pick<Trip, 'dest_lat' | 'dest_lng' | 'country_code' | 'start_date' | 'end_date' | 'notes' | 'cover_art' | 'status'>>
): Promise<Trip> {
  const id = newId('trip');
  await executeUpdate(
    db,
    `INSERT INTO trips (id, tenant_id, user_id, title, destination, dest_lat, dest_lng, country_code, start_date, end_date, status, notes, cover_art, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
    [id, tenantId, userId, t.title.slice(0, 120), t.destination.slice(0, 120), t.dest_lat ?? null, t.dest_lng ?? null, t.country_code ?? null, t.start_date ?? null, t.end_date ?? null, t.status ?? 'planned', t.notes ?? null, t.cover_art ?? null]
  );
  const rows = await executeQuery<Trip>(db, 'SELECT * FROM trips WHERE id = ?', [id]);
  return rows[0];
}

export async function updateTrip(db: D1Database, tenantId: string, tripId: string, patch: Partial<Trip>): Promise<void> {
  const allowed: (keyof Trip)[] = ['title', 'destination', 'dest_lat', 'dest_lng', 'country_code', 'start_date', 'end_date', 'status', 'notes', 'cover_art'];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(patch[k]);
    }
  }
  if (!sets.length) return;
  sets.push('updated_at = datetime("now")');
  params.push(tripId, tenantId);
  await executeUpdate(db, `UPDATE trips SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
}

export async function deleteTrip(db: D1Database, tenantId: string, tripId: string): Promise<boolean> {
  await executeUpdate(db, 'DELETE FROM trip_stops WHERE trip_id = ? AND tenant_id = ?', [tripId, tenantId]);
  await executeUpdate(db, 'DELETE FROM trip_days WHERE trip_id = ? AND tenant_id = ?', [tripId, tenantId]);
  const res = await executeUpdate(db, 'DELETE FROM trips WHERE id = ? AND tenant_id = ?', [tripId, tenantId]);
  return (res.meta.changes ?? 0) > 0;
}

export async function addDay(db: D1Database, tenantId: string, tripId: string, dayIndex: number, date: string | null, title: string | null, notes: string | null): Promise<TripDay> {
  const id = newId('day');
  await executeUpdate(db, 'INSERT INTO trip_days (id, trip_id, tenant_id, day_index, date, title, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, tripId, tenantId, dayIndex, date, title, notes]);
  return { id, trip_id: tripId, tenant_id: tenantId, day_index: dayIndex, date, title, notes };
}

export async function updateDay(db: D1Database, tenantId: string, dayId: string, patch: Partial<Pick<TripDay, 'title' | 'notes' | 'date' | 'day_index'>>): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of ['title', 'notes', 'date', 'day_index'] as const) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(patch[k]);
    }
  }
  if (!sets.length) return;
  params.push(dayId, tenantId);
  await executeUpdate(db, `UPDATE trip_days SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
}

export async function deleteDay(db: D1Database, tenantId: string, dayId: string): Promise<void> {
  await executeUpdate(db, 'DELETE FROM trip_stops WHERE day_id = ? AND tenant_id = ?', [dayId, tenantId]);
  await executeUpdate(db, 'DELETE FROM trip_days WHERE id = ? AND tenant_id = ?', [dayId, tenantId]);
}

export async function clearDays(db: D1Database, tenantId: string, tripId: string): Promise<void> {
  await executeUpdate(db, 'DELETE FROM trip_stops WHERE trip_id = ? AND tenant_id = ?', [tripId, tenantId]);
  await executeUpdate(db, 'DELETE FROM trip_days WHERE trip_id = ? AND tenant_id = ?', [tripId, tenantId]);
}

export async function addStop(
  db: D1Database,
  tenantId: string,
  tripId: string,
  dayId: string,
  s: Partial<TripStop> & Pick<TripStop, 'name' | 'kind'>
): Promise<TripStop> {
  const id = newId('stop');
  const posRows = await executeQuery<{ m: number | null }>(db, 'SELECT MAX(position) AS m FROM trip_stops WHERE day_id = ? AND tenant_id = ?', [dayId, tenantId]);
  const position = s.position ?? (posRows[0]?.m ?? -1) + 1;
  await executeUpdate(
    db,
    `INSERT INTO trip_stops (id, day_id, trip_id, tenant_id, position, kind, name, address, lat, lng, start_time, end_time, cost_estimate, currency, booking_url, source, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dayId, tripId, tenantId, position, s.kind, s.name.slice(0, 200), s.address ?? null, s.lat ?? null, s.lng ?? null, s.start_time ?? null, s.end_time ?? null, s.cost_estimate ?? null, s.currency ?? null, s.booking_url ?? null, s.source ?? null, s.notes ?? null]
  );
  const rows = await executeQuery<TripStop>(db, 'SELECT * FROM trip_stops WHERE id = ?', [id]);
  return rows[0];
}

export async function updateStop(db: D1Database, tenantId: string, stopId: string, patch: Partial<TripStop>): Promise<void> {
  const allowed: (keyof TripStop)[] = ['day_id', 'position', 'kind', 'name', 'address', 'lat', 'lng', 'start_time', 'end_time', 'cost_estimate', 'currency', 'booking_url', 'notes'];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(patch[k]);
    }
  }
  if (!sets.length) return;
  params.push(stopId, tenantId);
  await executeUpdate(db, `UPDATE trip_stops SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
}

export async function deleteStop(db: D1Database, tenantId: string, stopId: string): Promise<void> {
  await executeUpdate(db, 'DELETE FROM trip_stops WHERE id = ? AND tenant_id = ?', [stopId, tenantId]);
}
