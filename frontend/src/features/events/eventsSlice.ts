import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { api, getAuthHeader } from "../../shared/api";
import type { CreateEventPayload, EventItem } from "../../types/event";

type EventsState = {
  publicEvents: EventItem[];
  myEvents: EventItem[];
  selectedEvent: EventItem | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
};

const initialState: EventsState = {
  publicEvents: [],
  myEvents: [],
  selectedEvent: null,
  status: "idle",
  error: null,
};

export const fetchPublicEvents = createAsyncThunk(
  "events/fetchPublic",
  async () => {
    const response = await api.get<EventItem[]>("/events");
    return response.data;
  },
);

export const fetchEventById = createAsyncThunk(
  "events/fetchById",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;
    const response = await api.get<EventItem>(`/events/${eventId}`, {
      headers: getAuthHeader(state.auth.token),
    });
    return response.data;
  },
);

export const fetchMyEvents = createAsyncThunk(
  "events/fetchMyEvents",
  async (_, { getState }) => {
    const state = getState() as RootState;
    const response = await api.get<EventItem[]>("/users/me/events", {
      headers: getAuthHeader(state.auth.token),
    });
    return response.data;
  },
);

export const createEvent = createAsyncThunk(
  "events/createEvent",
  async (payload: CreateEventPayload, { getState }) => {
    const state = getState() as RootState;
    const response = await api.post<EventItem>("/events", payload, {
      headers: getAuthHeader(state.auth.token),
    });
    return response.data;
  },
);

export const joinEvent = createAsyncThunk(
  "events/joinEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;

    await api.post(
      `/events/${eventId}/join`,
      {},
      {
        headers: getAuthHeader(state.auth.token),
      },
    );

    return eventId;
  },
);

export const leaveEvent = createAsyncThunk(
  "events/leaveEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;

    await api.post(
      `/events/${eventId}/leave`,
      {},
      {
        headers: getAuthHeader(state.auth.token),
      },
    );

    return eventId;
  },
);

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicEvents.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPublicEvents.fulfilled, (state, action) => {
        state.status = "idle";
        state.publicEvents = action.payload;
      })
      .addCase(fetchPublicEvents.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to load events";
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.selectedEvent = action.payload;
      })
      .addCase(fetchMyEvents.fulfilled, (state, action) => {
        state.myEvents = action.payload;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.publicEvents.unshift(action.payload);
      });
  },
});

export const eventsReducer = eventsSlice.reducer;
