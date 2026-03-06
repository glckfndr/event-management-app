import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import {
  createTestStore,
  renderWithProviders,
} from "../../test/renderWithProviders";

const LoginProbe = () => {
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from ?? "";

  return <p>{from}</p>;
};

describe("ProtectedRoute", () => {
  it("preserves pathname, search, and hash in redirect state", () => {
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
      },
    });

    const expectedFrom = "/events/create?date=2026-03-06#section";

    renderWithProviders(
      <MemoryRouter initialEntries={[expectedFrom]}>
        <Routes>
          <Route
            path="/events/create"
            element={
              <ProtectedRoute>
                <p>Protected</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(document.body).toHaveTextContent(expectedFrom);
  });
});
