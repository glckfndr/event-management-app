import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('returns payload when token payload is valid', () => {
    const payload = {
      sub: 'user-id',
      email: 'user@example.com',
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('throws UnauthorizedException when payload is invalid', () => {
    expect(() =>
      strategy.validate({ sub: 'user-id', email: '' }),
    ).toThrow(UnauthorizedException);
  });
});
