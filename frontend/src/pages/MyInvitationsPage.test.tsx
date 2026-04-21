import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { api } from "../shared/api/client";
import { MyInvitationsPage } from "./MyInvitationsPage";
import {
  createTestStore,
  renderWithProviders,
} from "../test/renderWithProviders";

describe("MyInvitationsPage", () => {
  it("loads invitations and allows accepting pending invitation", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: [
        {
          id: "inv-1",
          eventId: "evt-1",
          invitedByUserId: "org-1",
          invitedUserId: "usr-1",
          status: "pending",
          createdAt: "2099-01-01T00:00:00.000Z",
          invitedByUser: { id: "org-1", email: "organizer@example.com" },
          event: {
            id: "evt-1",
            title: "Private meetup",
            eventDate: "2099-01-10T10:00:00.000Z",
            visibility: "private",
            organizerId: "org-1",
          },
        },
      ],
    });

    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        id: "inv-1",
        eventId: "evt-1",
        invitedByUserId: "org-1",
        invitedUserId: "usr-1",
        status: "accepted",
        createdAt: "2099-01-01T00:00:00.000Z",
        invitedByUser: { id: "org-1", email: "organizer@example.com" },
        event: {
          id: "evt-1",
          title: "Private meetup",
          eventDate: "2099-01-10T10:00:00.000Z",
          visibility: "private",
          organizerId: "org-1",
        },
      },
    });

    const store = createTestStore({
      auth: {
        token: "token",
        user: { email: "invitee@example.com" },
        status: "idle",
        error: null,
        isAuthenticated: true,
        isInitialized: true,
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
      <MemoryRouter initialEntries={["/my-invitations"]}>
        <Routes>
          <Route path="/my-invitations" element={<MyInvitationsPage />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(await screen.findByText("Private meetup")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith("/invitations/inv-1/accept", {});
    });

    expect(screen.getByText("accepted")).toBeInTheDocument();
  });
});
