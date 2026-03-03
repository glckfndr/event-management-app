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
