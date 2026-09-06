import { create } from 'zustand';
import { authApi } from '../utils/api';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  signup: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signup: async (email, username, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.signup(email, username, password);
      const { token, user } = response.data.data;
      localStorage.setItem('authToken', token);
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Signup failed';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login(email, password);
      const { token, user } = response.data.data;
      localStorage.setItem('authToken', token);
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        set({ isAuthenticated: false });
        return;
      }

      const response = await authApi.getProfile();
      set({ user: response.data.data, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('authToken');
      set({ isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null })
}));
