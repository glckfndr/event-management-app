export type EventVisibility = "public" | "private";

export type EventUser = {
  id: string;
  email: string;
  name?: string;
};

export type EventParticipant = {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: string;
  user?: EventUser;
};

export type EventTag = {
  id: string;
  name: string;
};

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  visibility: EventVisibility;
  organizerId: string;
  organizer?: EventUser;
  participants?: EventParticipant[];
  tags?: EventTag[];
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  visibility?: EventVisibility;
  tags?: string[];
};
