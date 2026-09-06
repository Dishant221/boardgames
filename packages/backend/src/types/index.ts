import { D1Database } from '@cloudflare/workers-types';

export interface Env extends Record<string, unknown> {
  DB: D1Database;
  ENVIRONMENT: string;
  JWT_SECRET?: string;
}

export interface HonoEnv {
  Bindings: Env;
  Variables: {
    user?: AuthPayload;
  };
}

// User Types
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
}

// Game Session Types
export interface GameSession {
  id: string;
  game_type: 'monopoly';
  status: 'waiting' | 'playing' | 'completed';
  players: GamePlayer[];
  board_state: MonopolyBoardState;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_id?: string;
}

// Raw D1 row shape: players/board_state are stored as JSON strings
export interface GameSessionRow {
  id: string;
  game_type: 'monopoly';
  status: 'waiting' | 'playing' | 'completed';
  players: string;
  board_state: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_id?: string;
}

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

export interface MonopolyBoardState {
  currentPlayerIndex: number;
  diceRolls: [number, number];
  turnHistory: GameAction[];
  communityChest: string[];
  chance: string[];
  properties: PropertyState[];
}

export interface PropertyState {
  id: number;
  owner: string | null;
  houses: number;
  hotels: number;
  mortgaged: boolean;
}

export interface GameAction {
  playerIndex: number;
  action: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Player Stats Types
export interface PlayerStats {
  id: string;
  user_id: string;
  games_played: number;
  games_won: number;
  total_money_earned: number;
  favorite_game?: string;
  created_at: string;
  updated_at: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  game_type: 'monopoly';
  wins: number;
  rank: number;
  score: number;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreateGameRequest {
  game_type: 'monopoly';
  max_players: number;
}

export interface JoinGameRequest {
  game_id: string;
}
