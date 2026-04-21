import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { api } from "../shared/api/client";
import { CreateEventPage } from "./CreateEventPage";
import {
  createTestStore,
  renderWithProviders,
} from "../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CreateEventPage", () => {
  it("shows submission error and stays on page when create fails", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("Server is unavailable"));

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "user@example.com" },
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
        assistantError: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/create?date=2026-03-06"]}>
        <Routes>
          <Route path="/events/create" element={<CreateEventPage />} />
          <Route path="/events" element={<p>Events List</p>} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await userEvent.type(
      screen.getByPlaceholderText("e.g., Tech Conference 2025"),
      "My Event",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe what makes your event special..."),
      "Event description",
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g., Convention Center, San Francisco"),
      "Kyiv",
    );

    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    expect(
      await screen.findByText("Failed to create event. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Events List")).not.toBeInTheDocument();
  });

  it("sends normalized tags in create payload", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: { id: "evt-1" },
    });

    const store = createTestStore({
      auth: {
        token: "test-token",
        user: { email: "user@example.com" },
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
        assistantError: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/events/create?date=2026-03-06"]}>
        <Routes>
          <Route path="/events/create" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<p>Event Details</p>} />
          <Route path="/events" element={<p>Events List</p>} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await userEvent.type(
      screen.getByPlaceholderText("e.g., Tech Conference 2025"),
      "My Event",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe what makes your event special..."),
      "Event description",
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g., Convention Center, San Francisco"),
      "Kyiv",
    );

    await userEvent.type(
      screen.getByPlaceholderText("Add custom tag"),
      "  AI  ",
    );
    // Tag input should be trimmed before request payload is sent.
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });

    expect(postSpy).toHaveBeenCalledWith(
      "/events",
      expect.objectContaining({
        title: "My Event",
        description: "Event description",
        location: "Kyiv",
        tags: ["AI"],
      }),
    );
  });
});
