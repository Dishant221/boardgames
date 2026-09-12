/**
 * Shared backend types for Grand Tour.
 *
 * Multi-tenancy model: every signed-up user owns exactly one tenant. The tenant id
 * is embedded in the JWT and every D1 row carries a `tenant_id` column. Per-tenant
 * live state (quota counters, conversations, last known location) lives in a
 * dedicated Durable Object (`TenantAgent`) - i.e. every new user gets their own
 * isolated storage + compute resource. See docs/MULTI_TENANCY.md.
 */

export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface Env extends Record<string, unknown> {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: AiBinding;
  TENANT: DurableObjectNamespace;
  PROJECT_LEDGER: DurableObjectNamespace;
  ENVIRONMENT: string;
  PROJECT_SHARE?: string;
  TENANT_CAPACITY?: string;
  SYSTEM_RESERVE?: string;
  AI_MODEL?: string;
  APP_USER_AGENT?: string;
  JWT_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  TICKETMASTER_API_KEY?: string;
}

export interface HonoEnv {
  Bindings: Env;
  Variables: {
    user?: AuthPayload;
    tenantId?: string;
  };
}

// ---------------------------------------------------------------- Users / auth

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface AuthPayload {
  userId: string;
  email: string;
  username: string;
  tenantId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  home_city?: string;
}

// ------------------------------------------------------------------- Tenancy

export interface Tenant {
  id: string;
  owner_user_id: string;
  name: string;
  plan: 'free';
  created_at: string;
}

export type MetricName =
  | 'workers_requests'
  | 'd1_rows_read'
  | 'd1_rows_written'
  | 'kv_reads'
  | 'kv_writes'
  | 'do_requests'
  | 'ai_neurons'
  | 'external_calls';

export type MetricBag = Partial<Record<MetricName, number>>;

export interface QuotaDecision {
  allowed: boolean;
  reason?: string;
  metric?: MetricName;
  remaining: Record<MetricName, number>;
  reset_at: string;
}

export interface UsageStatus {
  tenant_id: string;
  day: string;
  reset_at: string;
  allowance: Record<MetricName, number>;
  used: Record<MetricName, number>;
  project: ProjectUsage | null;
}

export interface ProjectUsage {
  day: string;
  budget: Record<MetricName, number>;
  used: Record<MetricName, number>;
  exhausted: MetricName[];
}

// --------------------------------------------------------------- Preferences

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'brave' | 'ecosia';

export interface UserPreferences {
  user_id: string;
  tenant_id: string;
  home_city: string | null;
  home_lat: number | null;
  home_lng: number | null;
  search_engine: SearchEngine;
  units: 'metric' | 'imperial';
  language: string;
  currency: string;
  interests: string[];
  voice_enabled: boolean;
  updated_at: string;
}

// -------------------------------------------------------------------- Places

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  source: 'osm' | 'nominatim' | 'google' | 'user' | 'wikipedia';
  source_id?: string;
  tags?: Record<string, string>;
  distance_m?: number;
  website?: string;
  opening_hours?: string;
  phone?: string;
  rating?: number;
}

export interface SavedPlace extends Place {
  tenant_id: string;
  user_id: string;
  notes: string | null;
  created_at: string;
}

export interface GeocodeResult {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  type: string;
  country_code?: string;
  bounding_box?: [number, number, number, number];
}

// --------------------------------------------------------------------- Trips

export type StopKind =
  | 'sight'
  | 'food'
  | 'hotel'
  | 'transport'
  | 'flight'
  | 'activity'
  | 'event'
  | 'note';

export interface Trip {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  country_code: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'dreaming' | 'planned' | 'active' | 'done';
  notes: string | null;
  cover_art: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  tenant_id: string;
  day_index: number;
  date: string | null;
  title: string | null;
  notes: string | null;
}

export interface TripStop {
  id: string;
  day_id: string;
  trip_id: string;
  tenant_id: string;
  position: number;
  kind: StopKind;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null;
  end_time: string | null;
  cost_estimate: number | null;
  currency: string | null;
  booking_url: string | null;
  source: string | null;
  notes: string | null;
}

export interface TripWithDays extends Trip {
  days: (TripDay & { stops: TripStop[] })[];
}

// ----------------------------------------------------------------- Assistant

export type AssistantMode = 'chat' | 'call';

export type IntentKind =
  | 'flights'
  | 'hotels'
  | 'food'
  | 'sights'
  | 'events'
  | 'transport'
  | 'directions'
  | 'weather'
  | 'shopping'
  | 'safety'
  | 'nightlife'
  | 'nature'
  | 'itinerary'
  | 'general';

export interface IntentLink {
  label: string;
  url: string;
  provider: string;
  kind: IntentKind | 'search' | 'maps';
}

export interface WeatherSummary {
  lat: number;
  lng: number;
  timezone: string;
  current: {
    temperature_c: number;
    apparent_c: number;
    humidity: number;
    wind_kmh: number;
    precipitation_mm: number;
    weather_code: number;
    description: string;
    is_day: boolean;
  };
  daily: {
    date: string;
    t_max_c: number;
    t_min_c: number;
    precipitation_mm: number;
    precipitation_probability: number;
    weather_code: number;
    description: string;
    sunrise: string;
    sunset: string;
  }[];
}

export interface AssistantCard {
  type: 'places' | 'weather' | 'links' | 'route' | 'guide' | 'itinerary';
  title: string;
  payload: unknown;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  cards: AssistantCard[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: AssistantMode;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  mode?: AssistantMode;
  location?: GeoPoint & { accuracy_m?: number };
  trip_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: ChatMessage;
  reply: ChatMessage;
  intent: IntentKind;
  provider: string;
  usage: { ai_neurons: number };
}

// ------------------------------------------------------------------ Generic

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
