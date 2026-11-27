import { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

let server: Server;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database');

    server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Emergency Ambulance Dispatch Server running on port ${env.PORT} (0.0.0.0)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  const exitHandler = () => {
    if (server) {
      server.close(async () => {
        console.log('Server closed');
        await prisma.$disconnect();
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error: unknown) => {
    console.error('Unexpected Error:', error);
    // Neon PostgreSQL serverless idle timeouts or closed sockets should not crash the HTTP server
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('Closed') ||
      errorMessage.includes('connection closed') ||
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('Server has closed the connection')
    ) {
      console.warn('⚠️ Database connection reset/closed by host. Retaining HTTP server to allow reconnection on next request.');
      return;
    }
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    if (server) {
      server.close();
    }
  });
}

bootstrap();
