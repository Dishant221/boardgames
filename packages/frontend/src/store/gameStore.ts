import { create } from 'zustand';
import { AxiosError } from 'axios';
import { gameApi } from '../utils/api';

export interface GamePlayer {
  userId: string;
  username: string;
  color: string;
  position: number;
  money: number;
  properties: number[];
  jailedTurns: number;
  status: 'active' | 'bankrupt' | 'winner';
}

export interface GameSession {
  id: string;
  game_type: 'monopoly';
  status: 'waiting' | 'playing' | 'completed';
  players: GamePlayer[];
  board_state: Record<string, unknown>;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_id?: string;
}

interface GameStore {
  sessions: GameSession[];
  currentSession: GameSession | null;
  isLoading: boolean;
  error: string | null;

  fetchSessions: () => Promise<void>;
  getSession: (id: string) => Promise<void>;
  createSession: (gameType: string, maxPlayers: number) => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  clearCurrentSession: () => void;
  clearError: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await gameApi.listSessions();
      set({ sessions: response.data.data });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const message = (axiosError.response?.data as Record<string, string>)?.error || 'Failed to fetch sessions';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  getSession: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const response = await gameApi.getSession(id);
      set({ currentSession: response.data.data });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const message = (axiosError.response?.data as Record<string, string>)?.error || 'Failed to fetch session';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  createSession: async (gameType, maxPlayers) => {
    try {
      set({ isLoading: true, error: null });
      const response = await gameApi.createSession(gameType, maxPlayers);
      const newSession = response.data.data;
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSession: newSession
      }));
      return newSession.id;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const message = (axiosError.response?.data as Record<string, string>)?.error || 'Failed to create session';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  joinSession: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await gameApi.joinSession(sessionId);
      set({ currentSession: response.data.data });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const message = (axiosError.response?.data as Record<string, string>)?.error || 'Failed to join session';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearCurrentSession: () => set({ currentSession: null }),
  clearError: () => set({ error: null })
}));
