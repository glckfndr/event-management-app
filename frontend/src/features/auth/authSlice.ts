import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../shared/api/client";

type User = {
  sub?: string;
  email: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated?: boolean;
  isInitialized?: boolean;
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

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  status: "idle",
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (payload: LoginPayload) => {
    const response = await api.post<{
      user: User;
    }>("/auth/login", payload);

    return response.data;
  },
);

export const fetchSession = createAsyncThunk("auth/fetchSession", async () => {
  const response = await api.get<User>("/auth/me");
  return response.data;
});

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  await api.post("/auth/logout");
});

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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "idle";
        state.token = null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(loginUser.rejected, (state) => {
        state.status = "failed";
        state.error = "Invalid email or password";
        state.token = null;
        state.isAuthenticated = false;
        state.user = null;
        state.isInitialized = true;
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
      })
      .addCase(fetchSession.pending, (state) => {
        if (!state.isInitialized) {
          state.status = "loading";
        }
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.status = "idle";
        state.token = null;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(fetchSession.rejected, (state) => {
        state.status = "idle";
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "idle";
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.error = null;
      });
  },
});

export const authReducer = authSlice.reducer;
