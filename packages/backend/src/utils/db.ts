import { D1Database } from '@cloudflare/workers-types';

export interface DBContext {
  db: D1Database;
}

export async function executeQuery<T>(
  db: D1Database,
  query: string,
  params?: any[]
): Promise<T[]> {
  const stmt = db.prepare(query);
  const result = await (params ? stmt.bind(...params).all() : stmt.all());
  return result.results as T[];
}

export async function executeUpdate(
  db: D1Database,
  query: string,
  params?: any[]
): Promise<{ success: number; meta: any }> {
  const stmt = db.prepare(query);
  const result = await (params ? stmt.bind(...params).run() : stmt.run());
  return {
    success: result.success ? 1 : 0,
    meta: result.meta
  };
}

export async function getUserById(db: D1Database, userId: string) {
  const results = await executeQuery(
    db,
    'SELECT id, username, email, avatar_url, created_at, updated_at, last_login, is_active FROM users WHERE id = ?',
    [userId]
  );
  return results[0] || null;
}

export async function getUserByEmail(db: D1Database, email: string) {
  const results = await executeQuery(
    db,
    'SELECT id, username, email, password_hash, avatar_url, created_at, updated_at, last_login, is_active FROM users WHERE email = ?',
    [email]
  );
  return results[0] || null;
}

export async function getUserByUsername(db: D1Database, username: string) {
  const results = await executeQuery(
    db,
    'SELECT id, username, email, avatar_url, created_at, updated_at, is_active FROM users WHERE username = ?',
    [username]
  );
  return results[0] || null;
}

export async function createUser(
  db: D1Database,
  userId: string,
  email: string,
  username: string,
  passwordHash: string
) {
  return executeUpdate(
    db,
    'INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
    [userId, email, username, passwordHash]
  );
}

export async function getGameSession(db: D1Database, sessionId: string) {
  const results = await executeQuery(
    db,
    'SELECT * FROM game_sessions WHERE id = ?',
    [sessionId]
  );
  return results[0] || null;
}

export async function getActiveGameSessions(db: D1Database, limit = 50) {
  return executeQuery(
    db,
    'SELECT * FROM game_sessions WHERE status IN ("waiting", "playing") ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function createGameSession(
  db: D1Database,
  sessionId: string,
  gameType: string,
  playersJson: string,
  boardStateJson: string
) {
  return executeUpdate(
    db,
    'INSERT INTO game_sessions (id, game_type, status, players, board_state, created_at) VALUES (?, ?, "waiting", ?, ?, datetime("now"))',
    [sessionId, gameType, playersJson, boardStateJson]
  );
}

export async function updateGameSession(
  db: D1Database,
  sessionId: string,
  status: string,
  boardStateJson: string,
  winnerId?: string
) {
  const query = winnerId
    ? 'UPDATE game_sessions SET status = ?, board_state = ?, winner_id = ?, ended_at = datetime("now") WHERE id = ?'
    : 'UPDATE game_sessions SET status = ?, board_state = ? WHERE id = ?';

  const params = winnerId
    ? [status, boardStateJson, winnerId, sessionId]
    : [status, boardStateJson, sessionId];

  return executeUpdate(db, query, params);
}

export async function getPlayerStats(db: D1Database, userId: string) {
  const results = await executeQuery(
    db,
    'SELECT * FROM player_stats WHERE user_id = ?',
    [userId]
  );
  return results[0] || null;
}

export async function createPlayerStats(db: D1Database, userId: string) {
  const statsId = `stats_${Date.now()}`;
  return executeUpdate(
    db,
    'INSERT INTO player_stats (id, user_id, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))',
    [statsId, userId]
  );
}

export async function updatePlayerStats(
  db: D1Database,
  userId: string,
  wins?: number,
  gamesPlayed?: number,
  moneyEarned?: number
) {
  const updates: string[] = [];
  const params: any[] = [];

  if (wins !== undefined) {
    updates.push('games_won = games_won + ?');
    params.push(wins);
  }
  if (gamesPlayed !== undefined) {
    updates.push('games_played = games_played + ?');
    params.push(gamesPlayed);
  }
  if (moneyEarned !== undefined) {
    updates.push('total_money_earned = total_money_earned + ?');
    params.push(moneyEarned);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = datetime("now")');
  params.push(userId);

  const query = `UPDATE player_stats SET ${updates.join(', ')} WHERE user_id = ?`;
  return executeUpdate(db, query, params);
}

export async function getLeaderboard(
  db: D1Database,
  gameType: string,
  limit = 100
) {
  return executeQuery(
    db,
    'SELECT * FROM leaderboard WHERE game_type = ? ORDER BY rank ASC LIMIT ?',
    [gameType, limit]
  );
}
