export type AuthenticatedUser = {
  sub: string;
  email: string;
};

export type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};
