import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authMiddleware, optionalAuth } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createPreferencesRouter } from './routes/preferences';
import { createPlacesRouter } from './routes/places';
import { createGuideRouter } from './routes/guide';
import { createTripsRouter } from './routes/trips';
import { createAssistantRouter } from './routes/assistant';
import { createDiscoverRouter } from './routes/discover';
import { readBudgetConfig, projectBudget, tenantAllowance } from './tenancy/limits';
import { aiProviderName } from './ai/provider';
import type { Env, HonoEnv } from './types';

export { TenantAgent } from './tenancy/TenantAgent';
export { ProjectLedger } from './tenancy/ProjectLedger';

/**
 * Grand Tour API - Cloudflare Worker.
 * The Hono app is built ONCE at module scope (isolate start), not per request.
 */
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.boardgamesepic.com',
  'https://boardgamesepic.com',
  'https://test.boardgamesepic.com',
  'https://boardgames-frontend-prod.sarkkarijobseva.workers.dev',
  'https://boardgames-frontend-testing.sarkkarijobseva.workers.dev'
]);

const app = new Hono<HonoEnv>();

app.use(logger());
app.use(
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    referrerPolicy: 'no-referrer',
    crossOriginResourcePolicy: 'cross-origin'
  })
);
app.use(
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.has(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Retry-After', 'X-Quota-Reset']
  })
);

app.get('/health', (c) => {
  const cfg = readBudgetConfig(c.env);
  return c.json({
    success: true,
    service: 'grand-tour-api',
    environment: c.env.ENVIRONMENT,
    ai_provider: aiProviderName(c.env),
    tenancy: {
      project_share: cfg.projectShare,
      tenant_capacity: cfg.tenantCapacity,
      system_reserve: cfg.systemReserve,
      project_daily_budget: projectBudget(cfg),
      per_tenant_daily_allowance: tenantAllowance(cfg)
    },
    integrations: {
      google_places: Boolean(c.env.GOOGLE_MAPS_API_KEY),
      ticketmaster: Boolean(c.env.TICKETMASTER_API_KEY),
      anthropic: Boolean(c.env.ANTHROPIC_API_KEY)
    }
  });
});

const api = new Hono<HonoEnv>();

// Public / optional auth
api.use('/auth/*', optionalAuth);
api.route('/auth', createAuthRouter());

// Everything else requires a valid JWT that carries a tenant id.
api.use('/preferences/*', authMiddleware);
api.use('/preferences', authMiddleware);
api.use('/places/*', authMiddleware);
api.use('/guide', authMiddleware);
api.use('/guide/*', authMiddleware);
api.use('/trips', authMiddleware);
api.use('/trips/*', authMiddleware);
api.use('/assistant/*', authMiddleware);
api.use('/discover/*', authMiddleware);

api.route('/preferences', createPreferencesRouter());
api.route('/places', createPlacesRouter());
api.route('/guide', createGuideRouter());
api.route('/trips', createTripsRouter());
api.route('/assistant', createAssistantRouter());
api.route('/discover', createDiscoverRouter());

app.route('/api', api);

app.notFound((c) => c.json({ success: false, error: 'Not found', path: c.req.path }, 404));

app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    return app.fetch(request, env, ctx);
  }
};
