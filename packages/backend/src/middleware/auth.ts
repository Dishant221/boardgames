import { Context, Next } from 'hono';
import { extractToken, verifyToken } from '../utils/jwt';
import { AuthPayload } from '../types';

declare global {
  namespace HonoRequest {
    interface HonoRequest {
      user?: AuthPayload;
    }
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      { success: false, error: 'Missing authorization token' },
      401
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json(
      { success: false, error: 'Invalid or expired token' },
      401
    );
  }

  c.set('user', payload);
  await next();
}

export function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      c.set('user', payload);
    }
  }

  return next();
}
