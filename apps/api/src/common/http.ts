import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import type { ZodType } from 'zod';

export const logger = pino({
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
});
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();
  const start = Date.now();
  res.setHeader('X-Request-Id', id);
  res.on('finish', () =>
    logger.info(
      { id, method: req.method, status: res.statusCode, ms: Date.now() - start },
      'request',
    ),
  );
  next();
}
export class Validate<T> implements PipeTransform {
  constructor(private schema: ZodType<T>) {}
  transform(raw: unknown): T {
    const result = this.schema.safeParse(raw);
    if (!result.success) throw new BadRequestException('Invalid input');
    return result.data;
  }
}
@Catch()
export class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500)
      logger.error(
        {
          requestId: response.getHeader('X-Request-Id'),
          errorType: error instanceof Error ? error.name : 'unknown',
        },
        'request failed',
      );
    response.status(status).json({
      status,
      requestId: response.getHeader('X-Request-Id'),
      message: status === 500 ? 'Request failed' : HttpStatus[status],
    });
  }
}
