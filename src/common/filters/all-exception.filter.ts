import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

interface ErrorResult {
  status: number;
  body: ErrorBody;
}

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  private readonly exposeStackTraces: boolean;

  constructor(config: ConfigService) {
    this.exposeStackTraces = config.get<string>('NODE_ENV') === 'development';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      this.logger.error(
        'Non-HTTP exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
      return;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = response.locals.requestId as string | undefined;

    const { status, body } = this.toErrorResult(exception);

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.originalUrl} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (response.headersSent) return;

    if (status === 401) response.setHeader('WWW-Authenticate', 'Bearer');

    response.status(status).json({
      error: {
        ...body,
        requestId,
        ...(this.exposeStackTraces && status >= 500
          ? {
              debug:
                exception instanceof Error
                  ? exception.stack
                  : String(exception),
            }
          : {}),
      },
    });
  }

  private toErrorResult(exception: unknown): ErrorResult {
    if (exception instanceof ThrottlerException) {
      return {
        status: 429,
        body: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
        },
      };
    }
    if (exception instanceof HttpException)
      return this.fromHttpException(exception);

    const database = this.fromDatabaseError(exception);
    if (database) return database;

    if (
      (exception as { type?: unknown } | null)?.type === 'entity.parse.failed'
    ) {
      return {
        status: 400,
        body: {
          code: 'INVALID_JSON',
          message: 'The request body is not valid JSON',
        },
      };
    }

    return {
      status: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side',
      },
    };
  }

  private fromHttpException(exception: HttpException): ErrorResult {
    const status = exception.getStatus();
    const res = exception.getResponse();

    if (typeof res === 'string') {
      return {
        status,
        body: { code: DEFAULT_CODES[status] ?? 'ERROR', message: res },
      };
    }

    const { code, message, details } = res as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    return {
      status,
      body: {
        code:
          typeof code === 'string' ? code : (DEFAULT_CODES[status] ?? 'ERROR'),
        message: Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : exception.message,
        ...(details !== undefined ? { details } : {}),
      },
    };
  }

  private fromDatabaseError(exception: unknown): ErrorResult | null {
    const code =
      exception instanceof QueryFailedError
        ? (exception.driverError as { code?: string }).code
        : (exception as { code?: unknown } | null)?.code;

    switch (code) {
      case '23505':
        return {
          status: 409,
          body: { code: 'CONFLICT', message: 'This value already exists' },
        };
      case '23503':
        return {
          status: 409,
          body: {
            code: 'REFERENCE_CONFLICT',
            message: 'This conflicts with related data',
          },
        };
      case '23514':
      case '23502':
        return {
          status: 422,
          body: {
            code: 'CONSTRAINT_VIOLATION',
            message: 'Some values are not allowed',
          },
        };
      case 'ECONNREFUSED':
      case 'ETIMEDOUT':
      case '57P01':
        return {
          status: 503,
          body: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable. Please try again',
          },
        };
      default:
        return null;
    }
  }
}
