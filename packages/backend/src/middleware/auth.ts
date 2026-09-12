import type { Context, Next } from 'hono';
import { extractToken, verifyToken, DEV_JWT_SECRET } from '../utils/jwt';
import type { HonoEnv } from '../types';

/** Requires a valid JWT that carries a tenant id; sets `user` and `tenantId`. */
export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json({ success: false, error: 'Missing authorization token' }, 401);
  }
  const payload = await verifyToken(token, c.env.JWT_SECRET || DEV_JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
  if (!payload.tenantId) {
    // Token issued before the multi-tenant pivot - force a re-login so a tenant is provisioned.
    return c.json({ success: false, error: 'Session predates your workspace. Please log in again.' }, 401);
  }
  c.set('user', payload);
  c.set('tenantId', payload.tenantId);
  await next();
}

export async function optionalAuth(c: Context<HonoEnv>, next: Next) {
  const token = extractToken(c.req.header('Authorization'));
  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET || DEV_JWT_SECRET);
    if (payload) {
      c.set('user', payload);
      if (payload.tenantId) c.set('tenantId', payload.tenantId);
    }
  }
  return next();
}
