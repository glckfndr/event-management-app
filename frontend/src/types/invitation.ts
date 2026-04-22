import type { EventItem, EventUser } from "./event";

export type InvitationStatus = "pending" | "accepted" | "declined";

export type InvitationItem = {
  id: string;
  eventId: string;
  invitedByUserId: string;
  invitedUserId: string;
  status: InvitationStatus;
  createdAt: string;
  event?: EventItem;
  invitedByUser?: EventUser;
  invitedUser?: EventUser;
};
