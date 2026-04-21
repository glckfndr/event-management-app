import { describe, it, expect, beforeEach } from "vitest";
import { authReducer, loginUser } from "./authSlice";

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores authenticated user from login payload", () => {
    const state = authReducer(
      undefined,
      loginUser.fulfilled(
        {
          user: {
            sub: "user-id",
            email: "normalized.user@example.com",
          },
        },
        "request-id",
        {
          email: "  RAW@Example.com  ",
          password: "password",
        },
      ),
    );

    expect(state.token).toBeNull();
    expect(state.user).toEqual({
      sub: "user-id",
      email: "normalized.user@example.com",
    });
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("keeps user null when login payload has no user", () => {
    const state = authReducer(
      undefined,
      loginUser.rejected(new Error("Unauthorized"), "request-id", {
        email: "  RAW@Example.com  ",
        password: "password",
      }),
    );

    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });
});
