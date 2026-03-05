export type EventVisibility = "public" | "private";

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  visibility: EventVisibility;
  organizerId: string;
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  visibility?: EventVisibility;
};
