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

// Security and utility middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Global Rate Limiter
app.use(globalRateLimiter);

// Mount main API router under /api/v1
app.use('/api/v1', appRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Emergency Ambulance Dispatch API v1',
  });
});

// Not Found Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;
