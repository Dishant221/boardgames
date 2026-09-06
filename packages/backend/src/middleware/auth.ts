import { Context, Next } from 'hono';
import { extractToken, verifyToken, DEV_JWT_SECRET } from '../utils/jwt';
import { HonoEnv } from '../types';

export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      { success: false, error: 'Missing authorization token' },
      401
    );
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET || DEV_JWT_SECRET);
  if (!payload) {
    return c.json(
      { success: false, error: 'Invalid or expired token' },
      401
    );
  }

  c.set('user', payload);
  await next();
}

export async function optionalAuth(c: Context<HonoEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET || DEV_JWT_SECRET);
    if (payload) {
      c.set('user', payload);
    }
  }

  return next();
}
