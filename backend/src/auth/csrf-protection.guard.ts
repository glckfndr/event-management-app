import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  extractCsrfHeaderFromRequest,
  extractCsrfTokenFromRequest,
  hasSessionCookie,
} from './auth-cookie.helpers';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfProtectionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (!hasSessionCookie(request)) {
      return true;
    }

    const csrfCookie = extractCsrfTokenFromRequest(request);
    const csrfHeader = extractCsrfHeaderFromRequest(request);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('CSRF validation failed.');
    }

    return true;
  }
}
