import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
      hidePoweredBy: true,
      xContentTypeOptions: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Uploads Directory
  const uploadsPath = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
    logger.log(`Created uploads directory: ${uploadsPath}`);
  }

  // Static Assets with Security Headers
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'");
      res.set('X-Frame-Options', 'DENY');
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('X-Download-Options', 'noopen');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Trust Proxy for correct IP detection behind reverse proxies
  app.set('trust proxy', true);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Start Server
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Uploads served from: ${uploadsPath}`);
  logger.log(`Security headers enabled via Helmet`);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.log('SIGTERM received. Graceful shutdown initiated.');
});

process.on('SIGINT', () => {
  logger.log('SIGINT received. Graceful shutdown initiated.');
});

bootstrap().catch((err) => {
  logger.error('Failed to start application:', err);
  process.exit(1);
});
