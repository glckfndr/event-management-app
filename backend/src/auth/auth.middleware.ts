import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';

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
    const authorization = req.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice(7).trim();
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
