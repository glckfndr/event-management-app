import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { logout } from "../auth/authSlice";
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

export const updateEvent = createAsyncThunk(
  "events/updateEvent",
  async (
    payload: {
      eventId: string;
      data: Partial<CreateEventPayload>;
    },
    { getState },
  ) => {
    const state = getState() as RootState;

    const response = await api.patch<EventItem>(
      `/events/${payload.eventId}`,
      payload.data,
      {
        headers: getAuthHeader(state.auth.token),
      },
    );

    return response.data;
  },
);

export const deleteEvent = createAsyncThunk(
  "events/deleteEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;

    await api.delete(`/events/${eventId}`, {
      headers: getAuthHeader(state.auth.token),
    });

    return eventId;
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
      .addCase(logout, (state) => {
        state.myEvents = [];
        state.selectedEvent = null;
        state.error = null;
        state.status = "idle";
      })
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
      .addCase(fetchEventById.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.selectedEvent = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.status = "idle";
        state.selectedEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to load event details";
        state.selectedEvent = null;
      })
      .addCase(fetchMyEvents.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMyEvents.fulfilled, (state, action) => {
        state.status = "idle";
        state.myEvents = action.payload;
      })
      .addCase(fetchMyEvents.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to load my events";
      })
      .addCase(createEvent.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.status = "idle";
        state.publicEvents.unshift(action.payload);
      })
      .addCase(createEvent.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to create event";
      })
      .addCase(updateEvent.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.status = "idle";

        state.publicEvents = state.publicEvents.map((event) =>
          event.id === action.payload.id ? action.payload : event,
        );
        state.myEvents = state.myEvents.map((event) =>
          event.id === action.payload.id ? action.payload : event,
        );

        if (state.selectedEvent?.id === action.payload.id) {
          state.selectedEvent = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to update event";
      })
      .addCase(deleteEvent.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.status = "idle";

        state.publicEvents = state.publicEvents.filter(
          (event) => event.id !== action.payload,
        );
        state.myEvents = state.myEvents.filter(
          (event) => event.id !== action.payload,
        );

        if (state.selectedEvent?.id === action.payload) {
          state.selectedEvent = null;
        }
      })
      .addCase(deleteEvent.rejected, (state) => {
        state.status = "failed";
        state.error = "Failed to delete event";
      });
  },
});

export const eventsReducer = eventsSlice.reducer;
