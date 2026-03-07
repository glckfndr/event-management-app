import { describe, it, expect, beforeEach } from "vitest";
import { authReducer, loginUser } from "./authSlice";

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

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("derives user email from JWT on login fulfilled", () => {
    const token = createTokenWithEmail("normalized.user@example.com");

    const state = authReducer(
      undefined,
      loginUser.fulfilled({ token }, "request-id", {
        email: "  RAW@Example.com  ",
        password: "password",
      }),
    );

    expect(state.token).toBe(token);
    expect(state.user).toEqual({ email: "normalized.user@example.com" });
    expect(localStorage.getItem("accessToken")).toBe(token);
  });

  it("sets user to null when JWT has no email claim", () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ sub: "user-id" }));
    const token = `${header}.${payload}.signature`;

    const state = authReducer(
      undefined,
      loginUser.fulfilled({ token }, "request-id", {
        email: "input@example.com",
        password: "password",
      }),
    );

    expect(state.token).toBe(token);
    expect(state.user).toBeNull();
  });
});
