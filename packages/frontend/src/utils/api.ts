import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (email: string, username: string, password: string) =>
    apiClient.post('/auth/signup', { email, username, password }),
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  getProfile: () => apiClient.get('/auth/me')
};

export const gameApi = {
  listSessions: () => apiClient.get('/games/sessions'),
  getSession: (id: string) => apiClient.get(`/games/sessions/${id}`),
  createSession: (gameType: string, maxPlayers: number) =>
    apiClient.post('/games/sessions', { game_type: gameType, max_players: maxPlayers }),
  joinSession: (sessionId: string) =>
    apiClient.post(`/games/sessions/${sessionId}/join`, {})
};

export default apiClient;
