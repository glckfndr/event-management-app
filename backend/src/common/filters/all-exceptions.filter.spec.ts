import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
  });

  const createHost = (url = '/test'): ArgumentsHost => {
    // Minimal HTTP host mock for filter response assertions.
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url }),
      }),
    };

    return host as unknown as ArgumentsHost;
  };

  it('uses structured HttpException response body without nesting it inside error field', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request',
    });

    filter.catch(exception, createHost('/events'));

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['name must be a string'],
        error: 'Bad Request',
        path: '/events',
      }),
    );
  });

  it('normalizes string HttpException responses into message field', () => {
    const exception = new HttpException('Forbidden', 403);

    filter.catch(exception, createHost('/events/private'));

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Forbidden',
        path: '/events/private',
      }),
    );
  });

  it('returns generic message for non-HttpException errors', () => {
    filter.catch(new Error('boom'), createHost('/events'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        path: '/events',
      }),
    );
  });
});
