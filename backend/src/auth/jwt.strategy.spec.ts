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
    expect(() => strategy.validate({ sub: 'user-id', email: '' })).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when payload fields are not strings', () => {
    const invalidPayload = {
      sub: 1,
      email: 123,
    } as unknown as { sub: string; email: string };

    // Runtime validation must reject structurally invalid decoded tokens.
    expect(() => strategy.validate(invalidPayload)).toThrow(
      UnauthorizedException,
    );
  });
});
