import { describe, it, expect } from "vitest";
import type { CreateEventPayload, EventItem } from "../../types/event";
import {
  createEvent,
  deleteEvent,
  eventsReducer,
  fetchEventById,
  fetchMyEvents,
  fetchPublicEvents,
  updateEvent,
} from "./eventsSlice";

const createEventItem = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "event-1",
  title: "Initial title",
  description: "Description",
  eventDate: "2026-03-06T10:00:00.000Z",
  location: "Kyiv",
  capacity: 100,
  visibility: "public",
  organizerId: "org-1",
  organizer: {
    id: "org-1",
    email: "organizer@example.com",
    name: "Organizer",
  },
  participants: [],
  ...overrides,
});

describe("eventsSlice", () => {
  it("handles fetchEventById pending/rejected to avoid stale loading state", () => {
    const loadedEvent = createEventItem();

    const loadedState = eventsReducer(
      undefined,
      fetchEventById.fulfilled(loadedEvent, "request-1", loadedEvent.id),
    );

    const pendingState = eventsReducer(
      loadedState,
      fetchEventById.pending("request-2", loadedEvent.id),
    );

    expect(pendingState.status).toBe("loading");
    expect(pendingState.error).toBeNull();
    expect(pendingState.selectedEvent).toBeNull();

    const rejectedState = eventsReducer(
      pendingState,
      fetchEventById.rejected(
        new Error("forbidden"),
        "request-2",
        loadedEvent.id,
      ),
    );

    expect(rejectedState.status).toBe("failed");
    expect(rejectedState.error).toBe("Failed to load event details");
    expect(rejectedState.selectedEvent).toBeNull();
  });

  it("tracks createEvent loading and prepends created event", () => {
    const payload: CreateEventPayload = {
      title: "New event",
      eventDate: "2026-03-07T11:00:00.000Z",
      visibility: "public",
    };
    const created = createEventItem({ id: "event-2", title: "New event" });

    const pendingState = eventsReducer(
      undefined,
      createEvent.pending("request-1", payload),
    );

    expect(pendingState.status).toBe("loading");
    expect(pendingState.error).toBeNull();

    const fulfilledState = eventsReducer(
      pendingState,
      createEvent.fulfilled(created, "request-1", payload),
    );

    expect(fulfilledState.status).toBe("idle");
    expect(fulfilledState.publicEvents[0]?.id).toBe("event-2");
  });

  it("syncs updateEvent result across public/my/selected state", () => {
    const base = createEventItem();
    const updated = createEventItem({ title: "Updated title" });

    const initial = eventsReducer(
      eventsReducer(
        eventsReducer(
          undefined,
          fetchPublicEvents.fulfilled([base], "request-1", undefined),
        ),
        fetchMyEvents.fulfilled([base], "request-2", undefined),
      ),
      fetchEventById.fulfilled(base, "request-3", base.id),
    );

    const next = eventsReducer(
      initial,
      updateEvent.fulfilled(updated, "request-4", {
        eventId: base.id,
        data: { title: "Updated title" },
      }),
    );

    expect(next.status).toBe("idle");
    expect(next.publicEvents[0]?.title).toBe("Updated title");
    expect(next.myEvents[0]?.title).toBe("Updated title");
    expect(next.selectedEvent?.title).toBe("Updated title");
  });

  it("removes deleted event from lists and selectedEvent", () => {
    const base = createEventItem();

    const initial = eventsReducer(
      eventsReducer(
        eventsReducer(
          undefined,
          fetchPublicEvents.fulfilled([base], "request-1", undefined),
        ),
        fetchMyEvents.fulfilled([base], "request-2", undefined),
      ),
      fetchEventById.fulfilled(base, "request-3", base.id),
    );

    const next = eventsReducer(
      initial,
      deleteEvent.fulfilled(base.id, "request-4", base.id),
    );

    expect(next.status).toBe("idle");
    expect(next.publicEvents).toHaveLength(0);
    expect(next.myEvents).toHaveLength(0);
    expect(next.selectedEvent).toBeNull();
  });
});
