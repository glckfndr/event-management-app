import { describe, expect, it, vi, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { api } from "../shared/api/client";
import { LoginPage } from "./LoginPage";
import {
  createTestStore,
  renderWithProviders,
} from "../test/renderWithProviders";

const createTokenWithEmail = (email: string) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const payload = btoa(JSON.stringify({ email }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${header}.${payload}.signature`;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("redirects to full from URL with query and hash after successful login", async () => {
    const token = createTokenWithEmail("user@example.com");
    vi.spyOn(api, "post").mockResolvedValue({
      data: {
        accessToken: token,
        tokenType: "Bearer",
      },
    });

    const store = createTestStore({
      auth: {
        token: null,
        user: null,
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
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: { from: "/events/create?date=2026-03-06#section" },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/events/create" element={<p>Create Event Screen</p>} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Create Event Screen")).toBeInTheDocument();
  });
});
