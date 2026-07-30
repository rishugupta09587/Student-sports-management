import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  const isAllowedOrigin = (origin: string): boolean => {
    if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return true;
    // In development, accept any localhost/127.0.0.1 port so a busy default
    // Vite port (5173 taken -> 5174, 5175, ...) never silently breaks CORS.
    if (!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
    return false;
  };

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(requestLogger);

  const apiLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
