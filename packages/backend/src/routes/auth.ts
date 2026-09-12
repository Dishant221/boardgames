import { Hono } from 'hono';
import { hash, compare } from 'bcryptjs';
import { generateToken, DEV_JWT_SECRET } from '../utils/jwt';
import {
  getUserByEmail,
  getUserByUsername,
  createUser,
  getUserById,
  getTenantForUser,
  createTenant,
  getPreferences,
  upsertPreferences,
  defaultPreferences,
  touchLastLogin
} from '../utils/db';
import { TenantClient } from '../tenancy/quota';
import { geocode, cityLabel } from '../providers/nominatim';
import type { LoginRequest, SignupRequest, User, ApiResponse, HonoEnv, Env, Tenant } from '../types';

/**
 * Auth routes. Signup provisions the user's tenant (D1 row + private Durable
 * Object) - "every new user gets new resources". Login lazily provisions a
 * tenant for accounts created before the pivot.
 */
export function createAuthRouter() {
  const router = new Hono<HonoEnv>();

  router.post('/signup', async (c) => {
    try {
      const body = (await c.req.json()) as SignupRequest;
      const { email, username, password, home_city } = body;

      if (!email || !username || !password) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return c.json({ success: false, error: 'Invalid email address' }, 400);
      }
      if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
        return c.json({ success: false, error: 'Username must be 3-32 characters (letters, numbers, _ . -)' }, 400);
      }
      if (password.length < 8) {
        return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
      }

      if (await getUserByEmail(c.env.DB, email)) {
        return c.json({ success: false, error: 'Email already registered' }, 409);
      }
      if (await getUserByUsername(c.env.DB, username)) {
        return c.json({ success: false, error: 'Username already taken' }, 409);
      }

      const passwordHash = await hash(password, 10);
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await createUser(c.env.DB, userId, email, username, passwordHash);

      const tenant = await provisionTenant(c.env, userId, username);

      // Seed preferences (optionally geocoding the home city).
      const prefs = defaultPreferences(userId, tenant.id);
      if (home_city) {
        const geo = (await geocode(c.env, home_city, 1).catch(() => []))[0];
        if (geo) {
          prefs.home_city = cityLabel(geo);
          prefs.home_lat = geo.lat;
          prefs.home_lng = geo.lng;
        } else {
          prefs.home_city = home_city.slice(0, 80);
        }
      }
      await upsertPreferences(c.env.DB, prefs);

      const token = await generateToken({ userId, email: email.toLowerCase(), username, tenantId: tenant.id }, c.env.JWT_SECRET || DEV_JWT_SECRET);

      const response: ApiResponse<{ token: string; user: Pick<User, 'id' | 'email' | 'username'>; tenant: Tenant }> = {
        success: true,
        data: { token, user: { id: userId, email: email.toLowerCase(), username }, tenant }
      };
      return c.json(response, 201);
    } catch (err) {
      console.error('signup failed', err);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  });

  router.post('/login', async (c) => {
    try {
      const body = (await c.req.json()) as LoginRequest;
      const { email, password } = body;
      if (!email || !password) {
        return c.json({ success: false, error: 'Missing email or password' }, 400);
      }

      const user = await getUserByEmail(c.env.DB, email);
      if (!user || !(await compare(password, user.password_hash ?? ''))) {
        return c.json({ success: false, error: 'Invalid email or password' }, 401);
      }

      let tenant = await getTenantForUser(c.env.DB, user.id);
      if (!tenant) tenant = await provisionTenant(c.env, user.id, user.username);
      await touchLastLogin(c.env.DB, user.id);

      const token = await generateToken(
        { userId: user.id, email: user.email, username: user.username, tenantId: tenant.id },
        c.env.JWT_SECRET || DEV_JWT_SECRET
      );

      const response: ApiResponse<{ token: string; user: Pick<User, 'id' | 'email' | 'username'>; tenant: Tenant }> = {
        success: true,
        data: { token, user: { id: user.id, email: user.email, username: user.username }, tenant }
      };
      return c.json(response);
    } catch (err) {
      console.error('login failed', err);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  });

  router.get('/me', async (c) => {
    try {
      const user = c.get('user');
      if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

      const userData = await getUserById(c.env.DB, user.userId);
      if (!userData) return c.json({ success: false, error: 'User not found' }, 404);

      const tenant = await getTenantForUser(c.env.DB, user.userId);
      const preferences = tenant ? await getPreferences(c.env.DB, tenant.id, user.userId) : null;

      return c.json({ success: true, data: { ...userData, tenant, preferences } });
    } catch (err) {
      console.error('me failed', err);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  });

  return router;
}

async function provisionTenant(env: Env, userId: string, username: string): Promise<Tenant> {
  const tenant = await createTenant(env.DB, userId, `${username}'s atlas`);
  try {
    await new TenantClient(env, tenant.id).init();
  } catch (err) {
    // The DO is created lazily on first use anyway; log and continue.
    console.error('tenant DO init failed', err);
  }
  return tenant;
}
