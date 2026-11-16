import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isAllowedOrigin, parseCorsOrigins } from './common/cors/cors-origins';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { validationExceptionFactory } from './common/validation/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const allowedOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGINS'));

  app.use(requestIdMiddleware);

  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => callback(null, isAllowedOrigin(origin, allowedOrigins)),
    exposedHeaders: ['X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  await app.listen(config.getOrThrow<number>('PORT'));
}
void bootstrap();
