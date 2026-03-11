import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { api } from "../shared/api";
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
});
