export type SessionUser = {
  sub: string;
  email: string;
};

export type AuthSessionPayload = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};
