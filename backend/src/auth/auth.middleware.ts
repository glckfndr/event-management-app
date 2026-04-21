import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { extractAccessTokenFromRequest } from './auth-cookie.helpers';

type RequestWithAuthToken = Request & {
  authToken?: string;
  user?: {
    sub: string;
    email: string;
  };
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: RequestWithAuthToken, _res: Response, next: NextFunction): void {
    const token = extractAccessTokenFromRequest(req);

    if (token) {
      req.authToken = token;

      try {
        const payload = this.jwtService.verify<{
          sub: string;
          email: string;
        }>(token);

        if (
          typeof payload?.sub === 'string' &&
          payload.sub.trim().length > 0 &&
          typeof payload?.email === 'string' &&
          payload.email.trim().length > 0
        ) {
          req.user = {
            sub: payload.sub,
            email: payload.email,
          };
        }
      } catch {
        req.user = undefined;
      }
    }

    next();
  }
}
