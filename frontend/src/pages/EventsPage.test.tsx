import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { api } from "../shared/api";
import { EventsPage } from "./EventsPage";
import { fetchPublicEvents } from "../features/events/eventsSlice";
import {
  createTestStore,
  renderWithProviders,
} from "../test/renderWithProviders";
import type { EventItem } from "../types/event";

const buildEvent = (overrides: Partial<EventItem>): EventItem => ({
  id: "evt-1",
  title: "React Meetup",
  description: "Frontend talks and networking",
  eventDate: "2099-03-20T18:00:00.000Z",
  location: "Kyiv",
  capacity: 50,
  visibility: "public",
  organizerId: "org-1",
  organizer: {
    id: "org-1",
    email: "organizer@example.com",
    name: "Organizer",
  },
  participants: [],
  tags: [{ id: "tag-1", name: "Tech" }],
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EventsPage", () => {
  it("shows tag chips on event cards", async () => {
    const events: EventItem[] = [
      buildEvent({
        id: "evt-1",
        title: "React Meetup",
        tags: [
          { id: "t-1", name: "Tech" },
          { id: "t-2", name: "Community" },
        ],
      }),
    ];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: { token: null, user: null, status: "idle", error: null },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route path="/events" element={<EventsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    const cardHeading = await screen.findByRole("heading", {
      name: "React Meetup",
    });
    const card = cardHeading.closest("article");

    expect(card).not.toBeNull();

    if (!card) {
      throw new Error("Event card not found");
    }

    expect(within(card).getByText("Tech")).toBeInTheDocument();
    expect(within(card).getByText("Community")).toBeInTheDocument();
  });

  it("filters by tags together with search and shows empty-state message", async () => {
    const events: EventItem[] = [
      buildEvent({
        id: "evt-1",
        title: "React Meetup",
        tags: [{ id: "t-1", name: "Tech" }],
      }),
      buildEvent({
        id: "evt-2",
        title: "Jazz Night",
        description: "Live concert",
        tags: [{ id: "t-2", name: "Music" }],
      }),
    ];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: { token: null, user: null, status: "idle", error: null },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route path="/events" element={<EventsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await screen.findByText("React Meetup");
    await screen.findByText("Jazz Night");

    await userEvent.click(screen.getByRole("button", { name: "Tech" }));

    await waitFor(() => {
      expect(screen.getByText("React Meetup")).toBeInTheDocument();
      expect(screen.queryByText("Jazz Night")).not.toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search events..."),
      "jazz",
    );

    expect(
      await screen.findByText("No events match the selected tags."),
    ).toBeInTheDocument();
  });

  it("prunes stale selected tags after events refresh", async () => {
    const firstResponse: EventItem[] = [
      buildEvent({
        id: "evt-1",
        title: "Tech Meetup",
        tags: [{ id: "t-1", name: "Tech" }],
      }),
    ];
    const secondResponse: EventItem[] = [
      buildEvent({
        id: "evt-2",
        title: "Art Night",
        tags: [{ id: "t-2", name: "Art" }],
      }),
    ];

    const getSpy = vi.spyOn(api, "get");
    getSpy.mockResolvedValueOnce({ data: firstResponse });
    getSpy.mockResolvedValueOnce({ data: secondResponse });

    const store = createTestStore({
      auth: { token: null, user: null, status: "idle", error: null },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events"]}>
        <Routes>
          <Route path="/events" element={<EventsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await screen.findByText("Tech Meetup");
    await userEvent.click(screen.getByRole("button", { name: "Tech" }));

    expect(
      screen.queryByText("No events match the selected tags."),
    ).not.toBeInTheDocument();

    await act(async () => {
      await store.dispatch(fetchPublicEvents());
    });

    await screen.findByText("Art Night");
    expect(
      screen.queryByRole("button", { name: "Tech" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("No events match the selected tags."),
    ).not.toBeInTheDocument();
  });
});
