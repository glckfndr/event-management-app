export const APP_ROUTES = {
  root: "/",
  events: "/events",
  eventDetails: "/events/:id",
  createEvent: "/events/create",
  myEvents: "/my-events",
  myInvitations: "/my-invitations",
  login: "/login",
  register: "/register",
  wildcard: "*",
} as const;
