import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable cookie parser for HTTP-only cookies
  app.use(cookieParser());

  // Enable CORS
  const corsOrigin = configService.get('CORS_ORIGIN') || '*';
  const allowedDomain = configService.get('ALLOWED_DOMAIN'); // e.g., 'nivaasone.com'
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // If CORS_ORIGIN is '*', allow all origins
      if (corsOrigin === '*') {
        return callback(null, true);
      }

      // If CORS_ORIGIN is a specific origin, check exact match
      if (corsOrigin && corsOrigin !== '*') {
        const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }

      // If ALLOWED_DOMAIN is set, allow all subdomains of that domain
      if (allowedDomain) {
        try {
          const originUrl = new URL(origin);
          const originHostname = originUrl.hostname.toLowerCase();
          const domainLower = allowedDomain.toLowerCase();
          
          // Check if origin is the exact domain or a subdomain
          if (originHostname === domainLower || originHostname.endsWith(`.${domainLower}`)) {
            return callback(null, true);
          }
        } catch (e) {
          // Invalid origin URL, reject
          return callback(new Error('Invalid origin'));
        }
      }

      // Reject by default
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📦 App Mode: ${configService.get('APP_MODE')}`);
}

bootstrap();
