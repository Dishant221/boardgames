-- 002: Grand Tour pivot - multi-tenant travel schema.
-- Existing game_* / player_stats / leaderboard tables from 001 are left in place
-- (untouched, unused) so this migration is non-destructive.

-- One tenant per user. The tenant id is also the Durable Object name of the
-- user's private TenantAgent (quota counters, conversations, live location).
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  home_city TEXT,
  home_lat REAL,
  home_lng REAL,
  search_engine TEXT NOT NULL DEFAULT 'google',
  units TEXT NOT NULL DEFAULT 'metric',
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'EUR',
  interests TEXT,               -- JSON array of strings
  voice_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS saved_places (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  source_id TEXT,
  tags TEXT,                    -- JSON object
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  dest_lat REAL,
  dest_lng REAL,
  country_code TEXT,
  start_date TEXT,              -- YYYY-MM-DD
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  cover_art TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS trip_days (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  date TEXT,
  title TEXT,
  notes TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE TABLE IF NOT EXISTS trip_stops (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'sight',
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  start_time TEXT,
  end_time TEXT,
  cost_estimate REAL,
  currency TEXT,
  booking_url TEXT,
  source TEXT,
  notes TEXT,
  FOREIGN KEY (day_id) REFERENCES trip_days(id),
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_tenant ON user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_tenant_user ON saved_places(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant_user ON trips(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days(trip_id, day_index);
CREATE INDEX IF NOT EXISTS idx_trip_stops_day ON trip_stops(day_id, position);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip ON trip_stops(trip_id);
