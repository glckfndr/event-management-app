import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const baseBody =
      exception instanceof HttpException
        ? this.normalizeHttpExceptionResponse(exception)
        : { message: 'Internal server error' };

    response.status(status).json({
      ...baseBody,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeHttpExceptionResponse(
    exception: HttpException,
  ): Record<string, unknown> {
    const exceptionResponse = exception.getResponse();

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      !Array.isArray(exceptionResponse)
    ) {
      return exceptionResponse as Record<string, unknown>;
    }

    return { message: exceptionResponse };
  }
}
