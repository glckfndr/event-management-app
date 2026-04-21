export const resolveJwtSecret = (): string => {
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (jwtSecret) {
    return jwtSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return 'dev-jwt-secret';
};

export const resolveJwtExpiresIn = (): string =>
  process.env.JWT_EXPIRES_IN?.trim() || '15m';

export const resolveRefreshJwtSecret = (): string => {
  const refreshJwtSecret = process.env.REFRESH_JWT_SECRET?.trim();

  if (refreshJwtSecret) {
    return refreshJwtSecret;
  }

  return resolveJwtSecret();
};

export const resolveRefreshJwtExpiresIn = (): string =>
  process.env.REFRESH_JWT_EXPIRES_IN?.trim() || '7d';
