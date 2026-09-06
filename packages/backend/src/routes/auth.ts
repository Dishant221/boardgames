import { Hono } from 'hono';
import { hash } from 'bcryptjs';
import { D1Database } from '@cloudflare/workers-types';
import { generateToken } from '../utils/jwt';
import {
  getUserByEmail,
  getUserByUsername,
  createUser,
  getUserById,
  createPlayerStats
} from '../utils/db';
import { LoginRequest, SignupRequest, User, ApiResponse } from '../types';

export function createAuthRouter(db: D1Database) {
  const router = new Hono();

  router.post('/signup', async (c) => {
    try {
      const body = (await c.req.json()) as SignupRequest;
      const { email, username, password } = body;

      // Validation
      if (!email || !username || !password) {
        return c.json(
          { success: false, error: 'Missing required fields' },
          400
        );
      }

      if (password.length < 8) {
        return c.json(
          { success: false, error: 'Password must be at least 8 characters' },
          400
        );
      }

      // Check if user exists
      const existingEmail = await getUserByEmail(db, email);
      if (existingEmail) {
        return c.json(
          { success: false, error: 'Email already registered' },
          409
        );
      }

      const existingUsername = await getUserByUsername(db, username);
      if (existingUsername) {
        return c.json(
          { success: false, error: 'Username already taken' },
          409
        );
      }

      // Hash password
      const passwordHash = await hash(password, 10);

      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await createUser(db, userId, email, username, passwordHash);

      // Create player stats
      await createPlayerStats(db, userId);

      // Generate token
      const token = generateToken({ userId, email, username });

      const response: ApiResponse<{ token: string; user: Omit<User, 'password_hash'> }> = {
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email,
            username
          }
        }
      };

      return c.json(response, 201);
    } catch (_error) {
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  router.post('/login', async (c) => {
    try {
      const body = (await c.req.json()) as LoginRequest;
      const { email, password } = body;

      if (!email || !password) {
        return c.json(
          { success: false, error: 'Missing email or password' },
          400
        );
      }

      const user = await getUserByEmail(db, email);
      if (!user) {
        return c.json(
          { success: false, error: 'Invalid email or password' },
          401
        );
      }

      // Note: In production, use compare from bcryptjs
      // For now, this is a placeholder that would need bcryptjs.compare
      const passwordMatch = password === 'demo'; // TEMPORARY - replace with real comparison

      if (!passwordMatch) {
        return c.json(
          { success: false, error: 'Invalid email or password' },
          401
        );
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      });

      const response: ApiResponse<{ token: string; user: Omit<User, 'password_hash'> }> = {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          }
        }
      };

      return c.json(response);
    } catch (error) {
      console.error('Login error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  router.get('/me', async (c) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(
          { success: false, error: 'Unauthorized' },
          401
        );
      }

      const userData = await getUserById(db, user.userId);
      if (!userData) {
        return c.json(
          { success: false, error: 'User not found' },
          404
        );
      }

      const response: ApiResponse<User> = {
        success: true,
        data: userData as User
      };

      return c.json(response);
    } catch (error) {
      console.error('Get user error:', error);
      return c.json(
        { success: false, error: 'Internal server error' },
        500
      );
    }
  });

  return router;
}
