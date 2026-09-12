import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url ?? '').includes('/auth/login')) {
      localStorage.removeItem('authToken');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Extract a human-readable error message from an axios error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as { response?: { data?: { error?: string; quota?: { reset_at?: string } }; status?: number }; message?: string };
  const data = e.response?.data;
  if (e.response?.status === 429) {
    const reset = data?.quota?.reset_at ? new Date(data.quota.reset_at).toLocaleTimeString() : 'midnight UTC';
    return `${data?.error ?? 'Daily quota reached'} (resets ${reset})`;
  }
  return data?.error ?? e.message ?? fallback;
}

export const authApi = {
  signup: (email: string, username: string, password: string, home_city?: string) =>
    apiClient.post('/auth/signup', { email, username, password, home_city }),
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  getProfile: () => apiClient.get('/auth/me')
};

export const preferencesApi = {
  get: () => apiClient.get('/preferences'),
  update: (patch: Record<string, unknown>) => apiClient.put('/preferences', patch),
  shareLocation: (lat: number, lng: number, accuracy_m?: number) => apiClient.post('/preferences/location', { lat, lng, accuracy_m })
};

export const placesApi = {
  categories: () => apiClient.get('/places/categories'),
  search: (q: string, limit = 5) => apiClient.get('/places/search', { params: { q, limit } }),
  reverse: (lat: number, lng: number) => apiClient.get('/places/reverse', { params: { lat, lng } }),
  nearby: (lat: number, lng: number, category: string, radius = 1500, limit = 30) =>
    apiClient.get('/places/nearby', { params: { lat, lng, category, radius, limit } }),
  find: (q: string, lat: number, lng: number) => apiClient.get('/places/find', { params: { q, lat, lng } }),
  landmarks: (lat: number, lng: number, radius = 1500) => apiClient.get('/places/landmarks', { params: { lat, lng, radius } }),
  directions: (from: [number, number], to: [number, number], mode: 'foot' | 'bike' | 'car' = 'foot') =>
    apiClient.get('/places/directions', { params: { from: from.join(','), to: to.join(','), mode } }),
  saved: () => apiClient.get('/places/saved'),
  save: (place: Record<string, unknown>) => apiClient.post('/places/saved', place),
  unsave: (id: string) => apiClient.delete(`/places/saved/${id}`)
};

export const guideApi = {
  byQuery: (q: string) => apiClient.get('/guide', { params: { q } }),
  byCoords: (lat: number, lng: number) => apiClient.get('/guide', { params: { lat, lng } })
};

export const tripsApi = {
  list: () => apiClient.get('/trips'),
  get: (id: string) => apiClient.get(`/trips/${id}`),
  create: (body: Record<string, unknown>) => apiClient.post('/trips', body),
  update: (id: string, patch: Record<string, unknown>) => apiClient.patch(`/trips/${id}`, patch),
  remove: (id: string) => apiClient.delete(`/trips/${id}`),
  addDay: (id: string, body: Record<string, unknown> = {}) => apiClient.post(`/trips/${id}/days`, body),
  updateDay: (id: string, dayId: string, patch: Record<string, unknown>) => apiClient.patch(`/trips/${id}/days/${dayId}`, patch),
  deleteDay: (id: string, dayId: string) => apiClient.delete(`/trips/${id}/days/${dayId}`),
  addStop: (id: string, dayId: string, body: Record<string, unknown>) => apiClient.post(`/trips/${id}/days/${dayId}/stops`, body),
  updateStop: (id: string, stopId: string, patch: Record<string, unknown>) => apiClient.patch(`/trips/${id}/stops/${stopId}`, patch),
  deleteStop: (id: string, stopId: string) => apiClient.delete(`/trips/${id}/stops/${stopId}`),
  reorder: (id: string, body: { stop_id: string; day_id: string; position: number }[]) => apiClient.post(`/trips/${id}/reorder`, body),
  legs: (id: string, dayId: string) => apiClient.get(`/trips/${id}/days/${dayId}/legs`),
  autoplan: (id: string) => apiClient.post(`/trips/${id}/autoplan`, {})
};

export const assistantApi = {
  conversations: () => apiClient.get('/assistant/conversations'),
  conversation: (id: string) => apiClient.get(`/assistant/conversations/${id}`),
  deleteConversation: (id: string) => apiClient.delete(`/assistant/conversations/${id}`),
  chat: (body: { conversation_id?: string; message: string; mode?: 'chat' | 'call'; location?: { lat: number; lng: number; accuracy_m?: number }; trip_id?: string }) =>
    apiClient.post('/assistant/chat', body)
};

export const discoverApi = {
  weather: (lat: number, lng: number, days = 7) => apiClient.get('/discover/weather', { params: { lat, lng, days } }),
  events: (lat: number, lng: number, q?: string, radius_km = 25) => apiClient.get('/discover/events', { params: { lat, lng, q, radius_km } }),
  bookings: (body: Record<string, unknown>) => apiClient.post('/discover/bookings/suggest', body),
  resolve: (q: string) => apiClient.get('/discover/resolve', { params: { q } }),
  usage: () => apiClient.get('/discover/usage')
};

export default apiClient;
