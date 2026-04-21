import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { extractAccessTokenFromRequest } from './auth-cookie.helpers';
import { resolveJwtSecret } from './jwt.config';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => extractAccessTokenFromRequest(request),
      ]),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    const isSubValid =
      typeof payload?.sub === 'string' && payload.sub.trim().length > 0;
    const isEmailValid =
      typeof payload?.email === 'string' && payload.email.trim().length > 0;

    if (!isSubValid || !isEmailValid) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }
}
