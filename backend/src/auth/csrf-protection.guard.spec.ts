import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  CSRF_TOKEN_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from './auth-cookie.helpers';
import { CsrfProtectionGuard } from './csrf-protection.guard';

const createExecutionContext = (request: Partial<Request>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe('CsrfProtectionGuard', () => {
  const guard = new CsrfProtectionGuard();

  it('allows safe HTTP methods', () => {
    const context = createExecutionContext({
      method: 'GET',
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE_NAME}=access-token`,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('bypasses CSRF check for unsafe methods without session cookies', () => {
    const context = createExecutionContext({
      method: 'POST',
      headers: {},
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when CSRF cookie and header do not match', () => {
    const context = createExecutionContext({
      method: 'PATCH',
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE_NAME}=access-token; ${CSRF_TOKEN_COOKIE_NAME}=cookie-token`,
        [CSRF_HEADER_NAME]: 'header-token',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows unsafe methods when CSRF cookie and header match', () => {
    const context = createExecutionContext({
      method: 'DELETE',
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE_NAME}=access-token; ${CSRF_TOKEN_COOKIE_NAME}=same-token`,
        [CSRF_HEADER_NAME]: 'same-token',
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
