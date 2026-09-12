import { create } from 'zustand';
import { authApi, preferencesApi, errorMessage } from '../utils/api';
import type { Preferences, Tenant, User } from '../lib/types';

interface AuthStore {
  user: User | null;
  tenant: Tenant | null;
  preferences: Preferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBooting: boolean;
  error: string | null;

  signup: (email: string, username: string, password: string, homeCity?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updatePreferences: (patch: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  tenant: null,
  preferences: null,
  isAuthenticated: false,
  isLoading: false,
  isBooting: true,
  error: null,

  signup: async (email, username, password, homeCity) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authApi.signup(email, username, password, homeCity);
      const { token, user, tenant } = res.data.data;
      localStorage.setItem('authToken', token);
      set({ user, tenant, isAuthenticated: true });
      const me = await authApi.getProfile();
      set({ user: me.data.data, tenant: me.data.data.tenant, preferences: me.data.data.preferences });
    } catch (err) {
      set({ error: errorMessage(err, 'Signup failed') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authApi.login(email, password);
      const { token, user, tenant } = res.data.data;
      localStorage.setItem('authToken', token);
      set({ user, tenant, isAuthenticated: true });
      const me = await authApi.getProfile();
      set({ user: me.data.data, tenant: me.data.data.tenant, preferences: me.data.data.preferences });
    } catch (err) {
      set({ error: errorMessage(err, 'Login failed') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, tenant: null, preferences: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        set({ isAuthenticated: false, isBooting: false });
        return;
      }
      const res = await authApi.getProfile();
      set({ user: res.data.data, tenant: res.data.data.tenant, preferences: res.data.data.preferences, isAuthenticated: true });
    } catch {
      localStorage.removeItem('authToken');
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isBooting: false });
    }
  },

  updatePreferences: async (patch) => {
    const res = await preferencesApi.update(patch);
    set({ preferences: res.data.data });
  },

  clearError: () => set({ error: null })
}));
