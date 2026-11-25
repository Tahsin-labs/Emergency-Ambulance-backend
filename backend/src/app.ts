import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import appRoutes from './routes';

const app: Application = express();

// Trust reverse proxy (e.g. Render, Heroku, Cloudflare)
app.set('trust proxy', 1);

// Security and utility middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.CORS_ORIGIN === '*') {
        return callback(null, true);
      }
      const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow or reflect
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Global Rate Limiter
app.use(globalRateLimiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Emergency Ambulance Dispatch API',
    version: 'v1',
    docs: 'see README',
  });
});

// Mount main API router under /api/v1
app.use('/api/v1', appRoutes);

// Not Found Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;
