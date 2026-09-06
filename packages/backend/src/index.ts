import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, optionalAuth } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createGamesRouter } from './routes/games';

interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  JWT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>();

    // Global middleware
    app.use(logger());
    app.use(
      cors({
        origin: (origin: string) => {
          const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://www.boardgamesepic.com',
            'https://boardgamesepic.com',
            'https://test.boardgamesepic.com'
          ];
          return allowedOrigins.includes(origin) ? origin : null;
        },
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization']
      })
    );

    // Health check
    app.get('/health', (c) => {
      return c.json({
        success: true,
        message: 'Server is running',
        environment: env.ENVIRONMENT
      });
    });

    // API Routes
    const apiApp = new Hono<{ Bindings: Env }>();

    // Auth routes (public)
    const authRouter = createAuthRouter(env.DB);
    apiApp.use('/auth/*', optionalAuth);
    apiApp.route('/auth', authRouter);

    // Game routes (protected)
    const gamesRouter = createGamesRouter(env.DB);
    apiApp.use('/games/*', authMiddleware);
    apiApp.route('/games', gamesRouter);

    // Mount API routes
    app.route('/api', apiApp);

    // 404 handler
    app.notFound((c) => {
      return c.json(
        {
          success: false,
          error: 'Not found',
          path: c.req.path
        },
        404
      );
    });

    // Error handler
    app.onError((err, c) => {
      console.error('Unhandled error:', err);
      return c.json(
        {
          success: false,
          error: 'Internal server error',
          message: err.message
        },
        500
      );
    });

    return app.fetch(request);
  }
};
