import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { api } from "../shared/api/client";
import { EventDetailsPage } from "./EventDetailsPage";
import {
  createTestStore,
  renderWithProviders,
} from "../test/renderWithProviders";
import type { EventItem } from "../types/event";

const createInitialEvent = (): EventItem => ({
  id: "evt-1",
  title: "Initial Event",
  description: "Initial description for the event",
  eventDate: "2099-07-10T12:00:00.000Z",
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
  tags: [{ id: "tag-1", name: "Business" }],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EventDetailsPage", () => {
  it("shows all event tags in details view", async () => {
    const event = createInitialEvent();
    event.tags = [
      { id: "tag-1", name: "Business" },
      { id: "tag-2", name: "Tech" },
    ];

    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/events/evt-1") {
        return { data: event };
      }

      if (url === "/users/me/events") {
        return { data: [] };
      }

      throw new Error(`Unexpected GET url: ${url}`);
    });

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "organizer@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
        assistantAnswer: null,
        assistantStatus: "idle",
        assistantError: null
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/evt-1"]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(await screen.findByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
  });

  it("keeps existing validation behavior in edit mode", async () => {
    const event = createInitialEvent();

    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/events/evt-1") {
        return { data: event };
      }

      if (url === "/users/me/events") {
        return { data: [] };
      }

      throw new Error(`Unexpected GET url: ${url}`);
    });

    const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({ data: event });

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "organizer@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
        assistantAnswer: null,
        assistantStatus: "idle",
        assistantError: null
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/evt-1"]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events" element={<p>Events List</p>} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await screen.findByText("Initial Event");
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const titleInput = screen.getByPlaceholderText("Title");
    await userEvent.clear(titleInput);
    // Empty title should fail client-side validation and skip PATCH call.
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("sends tags together with existing fields on update", async () => {
    const latestEvent = createInitialEvent();

    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/events/evt-1") {
        return { data: latestEvent };
      }

      if (url === "/users/me/events") {
        return { data: [] };
      }

      throw new Error(`Unexpected GET url: ${url}`);
    });

    const patchSpy = vi
      .spyOn(api, "patch")
      .mockResolvedValue({ data: latestEvent });

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "organizer@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
        assistantAnswer: null,
        assistantStatus: "idle",
        assistantError: null
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/evt-1"]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await screen.findByText("Initial Event");
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const titleInput = screen.getByPlaceholderText("Title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Event Title");

    await userEvent.click(screen.getByRole("button", { name: "Tech" }));
    // Update request must preserve existing fields and include updated tags.
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledTimes(1);
    });

    expect(patchSpy).toHaveBeenCalledWith(
      "/events/evt-1",
      expect.objectContaining({
        title: "Updated Event Title",
        description: "Initial description for the event",
        location: "Kyiv",
        capacity: 100,
        visibility: "public",
        tags: ["Business", "Tech"],
      }),
      expect.any(Object),
    );
  });

  it("prevents duplicate delete requests while deletion is in progress", async () => {
    const event = createInitialEvent();
    let resolveDelete: (() => void) | null = null;

    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/events/evt-1") {
        return { data: event };
      }

      if (url === "/users/me/events") {
        return { data: [] };
      }

      if (url === "/events") {
        return { data: [] };
      }

      throw new Error(`Unexpected GET url: ${url}`);
    });

    const deleteSpy = vi.spyOn(api, "delete").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = () => resolve({ data: undefined });
        }),
    );

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "organizer@example.com" },
        status: "idle",
        error: null,
      },
      events: {
        publicEvents: [],
        myEvents: [],
        selectedEvent: null,
        status: "idle",
        error: null,
        assistantAnswer: null,
        assistantStatus: "idle",
        assistantError: null
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/evt-1"]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events" element={<p>Events List</p>} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await screen.findByText("Initial Event");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const deleteModalHeading = await screen.findByText("Confirm deletion");
    const deleteModal = deleteModalHeading.parentElement;

    if (!deleteModal) {
      throw new Error("Expected delete confirmation modal");
    }

    const confirmDeleteButton = within(deleteModal).getByRole("button", {
      name: /^Delete$/,
    });

    await userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(confirmDeleteButton);
    expect(deleteSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete?.();
    });
  });
});
