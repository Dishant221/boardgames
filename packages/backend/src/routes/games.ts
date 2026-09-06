import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import {
  getGameSession,
  getActiveGameSessions,
  createGameSession,
  updateGameSession
} from '../utils/db';
import { CreateGameRequest, GameSession, ApiResponse } from '../types';

export function createGamesRouter(db: D1Database) {
  const router = new Hono();

  router.get('/sessions', async (c) => {
    try {
      const sessions = await getActiveGameSessions(db, 50);
      const response: ApiResponse<any[]> = {
        success: true,
        data: sessions.map(session => ({
          ...session,
          players: JSON.parse(session.players),
          board_state: JSON.parse(session.board_state)
        }))
      };
      return c.json(response);
    } catch (error) {
      console.error('Get sessions error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  router.post('/sessions', async (c) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(
          { success: false, error: 'Unauthorized' },
          401
        );
      }

      const body = (await c.req.json()) as CreateGameRequest;
      const { game_type, max_players } = body;

      if (!game_type || !max_players) {
        return c.json(
          { success: false, error: 'Missing required fields' },
          400
        );
      }

      if (game_type !== 'monopoly') {
        return c.json(
          { success: false, error: 'Invalid game type' },
          400
        );
      }

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      // Initialize game state
      const players = [
        {
          userId: user.userId,
          username: user.username,
          color: 'red',
          position: 0,
          money: 1500,
          properties: [],
          jailedTurns: 0,
          status: 'active'
        }
      ];

      const boardState = {
        currentPlayerIndex: 0,
        diceRolls: [0, 0],
        turnHistory: [],
        communityChest: [],
        chance: [],
        properties: Array.from({ length: 40 }, (_, i) => ({
          id: i,
          owner: null,
          houses: 0,
          hotels: 0,
          mortgaged: false
        }))
      };

      await createGameSession(
        db,
        sessionId,
        game_type,
        JSON.stringify(players),
        JSON.stringify(boardState)
      );

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: sessionId,
          game_type,
          status: 'waiting',
          players,
          board_state: boardState,
          created_at: new Date().toISOString()
        }
      };

      return c.json(response, 201);
    } catch (error) {
      console.error('Create session error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  router.get('/sessions/:id', async (c) => {
    try {
      const sessionId = c.req.param('id');
      const session = await getGameSession(db, sessionId);

      if (!session) {
        return c.json(
          { success: false, error: 'Session not found' },
          404
        );
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ...session,
          players: JSON.parse(session.players),
          board_state: JSON.parse(session.board_state)
        }
      };

      return c.json(response);
    } catch (error) {
      console.error('Get session error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  router.post('/sessions/:id/join', async (c) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(
          { success: false, error: 'Unauthorized' },
          401
        );
      }

      const sessionId = c.req.param('id');
      const session = await getGameSession(db, sessionId);

      if (!session) {
        return c.json(
          { success: false, error: 'Session not found' },
          404
        );
      }

      if (session.status !== 'waiting') {
        return c.json(
          { success: false, error: 'Cannot join a game that is already playing' },
          400
        );
      }

      const players = JSON.parse(session.players);
      const colors = ['red', 'blue', 'yellow', 'green'];
      const usedColors = players.map((p: any) => p.color);
      const availableColor = colors.find(c => !usedColors.includes(c));

      if (!availableColor) {
        return c.json(
          { success: false, error: 'Game is full' },
          400
        );
      }

      // Check if user already in game
      if (players.some((p: any) => p.userId === user.userId)) {
        return c.json(
          { success: false, error: 'Already in this game' },
          400
        );
      }

      players.push({
        userId: user.userId,
        username: user.username,
        color: availableColor,
        position: 0,
        money: 1500,
        properties: [],
        jailedTurns: 0,
        status: 'active'
      });

      await updateGameSession(
        db,
        sessionId,
        'waiting',
        session.board_state
      );

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ...session,
          players,
          board_state: JSON.parse(session.board_state)
        }
      };

      return c.json(response);
    } catch (error) {
      console.error('Join session error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  return router;
}
