/** Frontend mirror of the API shapes (kept intentionally small). */
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'brave' | 'ecosia';

export interface Tenant {
  id: string;
  owner_user_id: string;
  name: string;
  plan: string;
  created_at: string;
}

export interface Preferences {
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
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  tenant?: Tenant | null;
  preferences?: Preferences | null;
}

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
  source: string;
  source_id?: string;
  tags?: Record<string, string>;
  distance_m?: number;
  website?: string;
  opening_hours?: string;
  phone?: string;
  rating?: number;
  notes?: string | null;
}

export interface GeocodeResult {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  type: string;
  country_code?: string;
  label?: string;
}

export interface IntentLink {
  label: string;
  url: string;
  provider: string;
  kind: string;
}

export interface Weather {
  timezone: string;
  current: { temperature_c: number; apparent_c: number; humidity: number; wind_kmh: number; precipitation_mm: number; weather_code: number; description: string; is_day: boolean };
  daily: { date: string; t_max_c: number; t_min_c: number; precipitation_mm: number; precipitation_probability: number; weather_code: number; description: string; sunrise: string; sunset: string }[];
}

export interface RouteResult {
  mode: string;
  distance_m: number;
  duration_s: number;
  geometry: GeoPoint[];
  steps: { instruction: string; distance_m: number; duration_s: number; name: string }[];
  to?: GeocodeResult;
}

export interface Card {
  type: 'places' | 'weather' | 'links' | 'route' | 'guide' | 'itinerary';
  title: string;
  payload: unknown;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  cards: Card[] | null;
  created_at: string;
  pending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  mode: 'chat' | 'call';
  created_at: string;
  updated_at: string;
  message_count: number;
}

export type StopKind = 'sight' | 'food' | 'hotel' | 'transport' | 'flight' | 'activity' | 'event' | 'note';

export interface TripStop {
  id: string;
  day_id: string;
  trip_id: string;
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

export interface TripDay {
  id: string;
  trip_id: string;
  day_index: number;
  date: string | null;
  title: string | null;
  notes: string | null;
  stops: TripStop[];
}

export interface Trip {
  id: string;
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
  days?: TripDay[];
}

export type MetricName = 'workers_requests' | 'd1_rows_read' | 'd1_rows_written' | 'kv_reads' | 'kv_writes' | 'do_requests' | 'ai_neurons' | 'external_calls';

export interface Usage {
  tenant_id: string;
  day: string;
  reset_at: string;
  allowance: Record<MetricName, number>;
  used: Record<MetricName, number>;
  project: { day: string; budget: Record<MetricName, number>; used: Record<MetricName, number>; exhausted: MetricName[] } | null;
}

export interface GuideData {
  place: GeocodeResult & { label: string };
  summary: { title: string; extract: string; description?: string; thumbnail?: string; url: string; source: string } | null;
  wikipedia: { title: string; extract: string; url: string } | null;
  weather: Weather | null;
  essentials: {
    code: string;
    name: string;
    flag: string;
    capital?: string;
    currencies: { code: string; name: string; symbol?: string }[];
    languages: string[];
    calling_code?: string;
    driving_side?: string;
    timezones: string[];
    emergency: { police: string; ambulance: string; fire: string; general?: string };
    plugs: { types: string[]; voltage: string; frequency: string };
  } | null;
  phrases: { language: string; hello: string; thanks: string; please: string; help: string; bill: string; where: string } | null;
  sights: Place[];
  food: Place[];
  transit: Place[];
  events: LiveEvent[];
  links: Record<string, IntentLink[]>;
  art_keyword: string;
  sources: string[];
}

export interface LiveEvent {
  id: string;
  name: string;
  url: string;
  start: string | null;
  venue: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  image: string | null;
  price_min: number | null;
  currency: string | null;
}
