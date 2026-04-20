import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../shared/api/client";

type User = {
  email: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

const tokenFromStorage = localStorage.getItem("accessToken");

const decodeBase64Url = (value: string) => {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + paddingLength,
    "=",
  );

  return atob(paddedValue);
};

const getUserFromToken = (token: string | null): User | null => {
  if (!token) {
    return null;
  }

  try {
    const base64Payload = token.split(".")[1];

    if (!base64Payload) {
      return null;
    }

    const decoded = JSON.parse(decodeBase64Url(base64Payload)) as {
      email?: string;
    };

    if (!decoded.email) {
      return null;
    }

    return { email: decoded.email };
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  token: tokenFromStorage,
  user: getUserFromToken(tokenFromStorage),
  status: "idle",
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (payload: LoginPayload) => {
    const response = await api.post<{
      accessToken: string;
      tokenType: "Bearer";
    }>("/auth/login", payload);

    return {
      token: response.data.accessToken,
    };
  },
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (payload: RegisterPayload) => {
    const response = await api.post("/auth/register", payload);
    return response.data;
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("accessToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "idle";
        state.token = action.payload.token;
        state.user = getUserFromToken(action.payload.token);
        localStorage.setItem("accessToken", action.payload.token);
      })
      .addCase(loginUser.rejected, (state) => {
        state.status = "failed";
        state.error = "Invalid email or password";
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = "idle";
      })
      .addCase(registerUser.rejected, (state) => {
        state.status = "failed";
        state.error = "Registration failed";
      });
  },
});

export const { logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
