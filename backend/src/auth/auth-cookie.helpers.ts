import { randomBytes } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { resolveJwtExpiresIn, resolveRefreshJwtExpiresIn } from './jwt.config';

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
export const CSRF_TOKEN_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
};

const resolveMaxAge = (value: string): number => {
  const normalizedValue = value.trim().toLowerCase();

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue) * 1000;
  }

  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    throw new Error(`Unsupported cookie max-age value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit];
};

const getCookieOptions = (
  maxAge: number,
  overrides?: Partial<CookieOptions>,
): CookieOptions => ({
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge,
  ...overrides,
});

export const parseRequestCookies = (request: Request): Record<string, string> =>
  parseCookieHeader(request.headers.cookie);

export const extractCookieValue = (
  request: Request,
  cookieName: string,
): string | null => parseRequestCookies(request)[cookieName] ?? null;

export const extractAccessTokenFromRequest = (
  request: Request,
): string | null => {
  const accessToken = extractCookieValue(request, ACCESS_TOKEN_COOKIE_NAME);

  if (accessToken) {
    return accessToken;
  }

  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const bearerToken = authorization.slice(7).trim();
  return bearerToken || null;
};

export const extractRefreshTokenFromRequest = (
  request: Request,
): string | null => extractCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);

export const extractCsrfTokenFromRequest = (request: Request): string | null =>
  extractCookieValue(request, CSRF_TOKEN_COOKIE_NAME);

export const extractCsrfHeaderFromRequest = (
  request: Request,
): string | null => {
  const headerValue = request.headers[CSRF_HEADER_NAME];

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? null;
  }

  return typeof headerValue === 'string' ? headerValue : null;
};

export const hasSessionCookie = (request: Request): boolean => {
  const cookies = parseRequestCookies(request);

  return Boolean(
    cookies[ACCESS_TOKEN_COOKIE_NAME] || cookies[REFRESH_TOKEN_COOKIE_NAME],
  );
};

export const createCsrfToken = (): string => randomBytes(24).toString('hex');

export const setAuthCookies = (
  response: Response,
  input: {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  },
): void => {
  response.cookie(
    ACCESS_TOKEN_COOKIE_NAME,
    input.accessToken,
    getCookieOptions(resolveMaxAge(resolveJwtExpiresIn()), {
      httpOnly: true,
    }),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    input.refreshToken,
    getCookieOptions(resolveMaxAge(resolveRefreshJwtExpiresIn()), {
      httpOnly: true,
    }),
  );
  response.cookie(
    CSRF_TOKEN_COOKIE_NAME,
    input.csrfToken,
    getCookieOptions(resolveMaxAge(resolveRefreshJwtExpiresIn()), {
      httpOnly: false,
    }),
  );
};

export const clearAuthCookies = (response: Response): void => {
  const baseOptions = {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, baseOptions);
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseOptions);
  response.clearCookie(CSRF_TOKEN_COOKIE_NAME, baseOptions);
};
