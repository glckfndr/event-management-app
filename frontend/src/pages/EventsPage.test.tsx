import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { api } from "../shared/api";
import { EventsPage } from "./EventsPage";
import { fetchPublicEvents } from "../features/events/eventsSlice";
import { useAssistantUiStore } from "../features/events/assistantUiStore";
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

const createInitialEventsState = () => ({
  publicEvents: [],
  myEvents: [],
  selectedEvent: null,
  status: "idle" as const,
  error: null,
  assistantAnswer: null,
  assistantStatus: "idle" as const,
  assistantError: null,
});

afterEach(() => {
  vi.restoreAllMocks();
  useAssistantUiStore.getState().resetAssistantUiState();
  window.localStorage.clear();
});

describe("EventsPage", () => {
  it("hides AI Assistant section for unauthenticated users", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: { token: null, user: null, status: "idle", error: null },
      events: {
        ...createInitialEventsState(),
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

    expect(
      screen.queryByRole("heading", { name: "AI Assistant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Ask about your events..."),
    ).not.toBeInTheDocument();
  });

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
        ...createInitialEventsState(),
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
        ...createInitialEventsState(),
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

  it("searches by month, day and hour tokens", async () => {
    const events: EventItem[] = [
      buildEvent({
        id: "evt-1",
        title: "Morning Workshop",
        eventDate: "2099-03-20T09:30:00.000Z",
      }),
      buildEvent({
        id: "evt-2",
        title: "Evening Talk",
        eventDate: "2099-11-03T18:00:00.000Z",
      }),
    ];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: { token: null, user: null, status: "idle", error: null },
      events: {
        ...createInitialEventsState(),
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

    await screen.findByText("Morning Workshop");
    await screen.findByText("Evening Talk");

    const searchInput = screen.getByPlaceholderText("Search events...");
    const firstEventDayToken = String(new Date(events[0].eventDate).getDate());
    const secondEventHourToken = String(
      new Date(events[1].eventDate).getHours(),
    );

    await userEvent.type(searchInput, "november");
    expect(await screen.findByText("Evening Talk")).toBeInTheDocument();
    expect(screen.queryByText("Morning Workshop")).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, firstEventDayToken);
    expect(await screen.findByText("Morning Workshop")).toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, secondEventHourToken);
    expect(await screen.findByText("Evening Talk")).toBeInTheDocument();
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
        ...createInitialEventsState(),
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

  it("submits assistant question and renders returned answer", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    const getSpy = vi.spyOn(api, "get");
    getSpy.mockResolvedValue({ data: events });

    const postSpy = vi.spyOn(api, "post");
    postSpy.mockResolvedValue({
      data: { answer: "You have 3 events in total." },
    });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    await userEvent.type(
      screen.getByPlaceholderText("Ask about your events..."),
      "How many events do I have?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText("Assistant answer")).toBeInTheDocument();
    expect(screen.getByText("You have 3 events in total.")).toBeInTheDocument();

    expect(postSpy).toHaveBeenCalledWith(
      "/assistant/questions",
      { question: "How many events do I have?" },
      {
        headers: { Authorization: "Bearer token" },
      },
    );
  });

  it("keeps assistant live region mounted before answer updates", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    const liveRegion = document.querySelector('[aria-live="polite"]');

    expect(liveRegion).not.toBeNull();
    expect(screen.queryByText("Assistant answer")).not.toBeInTheDocument();
  });

  it("shows assistant error when API request fails", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    const getSpy = vi.spyOn(api, "get");
    getSpy.mockResolvedValue({ data: events });

    const postSpy = vi.spyOn(api, "post");
    postSpy.mockRejectedValue(new Error("Request failed"));

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    await userEvent.type(
      screen.getByPlaceholderText("Ask about your events..."),
      "How many upcoming events?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      await screen.findByText("Failed to get assistant answer"),
    ).toBeInTheDocument();

    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it("shows loading state while assistant request is in progress", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    let resolveRequest!: (value: { data: { answer: string } }) => void;
    const pendingRequest = new Promise<{ data: { answer: string } }>(
      (resolve) => {
        resolveRequest = resolve;
      },
    );

    vi.spyOn(api, "post").mockReturnValue(pendingRequest);

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    await userEvent.type(
      screen.getByPlaceholderText("Ask about your events..."),
      "How many events do I have?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      await screen.findByText("Getting assistant answer..."),
    ).toBeInTheDocument();

    resolveRequest({ data: { answer: "You have 3 events in total." } });

    await waitFor(() => {
      expect(
        screen.queryByText("Getting assistant answer..."),
      ).not.toBeInTheDocument();
    });
  });

  it("renders backend fallback message under assistant answer", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });
    vi.spyOn(api, "post").mockResolvedValue({
      data: {
        answer:
          "Sorry, I didn’t understand that. Please try rephrasing your question.",
      },
    });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    await userEvent.type(
      screen.getByPlaceholderText("Ask about your events..."),
      "random unclear request",
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText("Assistant answer")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sorry, I didn’t understand that. Please try rephrasing your question.",
      ),
    ).toBeInTheDocument();
  });

  it("shows recent assistant questions and allows selecting one", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });
    vi.spyOn(api, "post").mockResolvedValue({
      data: { answer: "You have 3 events in total." },
    });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    const firstQuestion = "How many events do I have?";
    const secondQuestion = "List my upcoming events";
    const assistantInput = screen.getByPlaceholderText(
      "Ask about your events...",
    );

    await userEvent.type(assistantInput, firstQuestion);
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    await screen.findByText("Assistant answer");

    await userEvent.click(
      screen.getByRole("button", { name: "Recent questions" }),
    );

    expect(
      screen.getByRole("button", { name: firstQuestion }),
    ).toBeInTheDocument();

    await userEvent.clear(assistantInput);
    await userEvent.type(assistantInput, secondQuestion);
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      await screen.findByRole("button", { name: secondQuestion }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: firstQuestion }),
    ).toBeInTheDocument();

    await userEvent.clear(assistantInput);
    await userEvent.click(screen.getByRole("button", { name: firstQuestion }));

    expect(assistantInput).toHaveValue(firstQuestion);
    expect(
      JSON.parse(
        window.localStorage.getItem("events.recentAssistantQuestions") ?? "[]",
      ),
    ).toEqual([secondQuestion, firstQuestion]);
  });

  it("loads recent assistant questions from localStorage", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    window.localStorage.setItem(
      "events.recentAssistantQuestions",
      JSON.stringify(["How many upcoming events?", "Show my tech events"]),
    );

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    const assistantInput = screen.getByPlaceholderText(
      "Ask about your events...",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Recent questions" }),
    );

    expect(
      screen.getByRole("button", { name: "How many upcoming events?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show my tech events" }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Show my tech events" }),
    );

    expect(assistantInput).toHaveValue("Show my tech events");
  });

  it("shows predefined assistant suggestions and fills input on click", async () => {
    const events: EventItem[] = [buildEvent({ id: "evt-1" })];

    vi.spyOn(api, "get").mockResolvedValue({ data: events });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "alice@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        ...createInitialEventsState(),
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

    const suggestion = "When is my next event?";
    const assistantInput = screen.getByPlaceholderText(
      "Ask about your events...",
    );

    await userEvent.click(screen.getByRole("button", { name: "Try asking" }));

    expect(
      screen.getByRole("button", { name: suggestion }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: suggestion }));

    expect(assistantInput).toHaveValue(suggestion);
  });
});
