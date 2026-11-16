import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const label = `[${response.locals.requestId}] ${request.method} ${request.originalUrl}`;
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `${label} ✓ ${(performance.now() - start).toFixed(1)}ms`,
          ),
        error: (error: Error) =>
          this.logger.warn(
            `${label} ✗ ${(performance.now() - start).toFixed(1)}ms – ${error.message}`,
          ),
      }),
    );
  }
}
