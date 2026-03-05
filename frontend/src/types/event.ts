export type EventVisibility = "public" | "private";

export type EventParticipant = {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: string;
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
  participants?: EventParticipant[];
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  visibility?: EventVisibility;
};
