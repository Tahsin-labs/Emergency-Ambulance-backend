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
