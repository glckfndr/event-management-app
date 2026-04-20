import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../../app/store";
import { logout } from "../../auth/authSlice";
import type { CreateEventPayload, EventItem } from "../../../types/event";
import {
  askAssistantQuestionRequest,
  createEventRequest,
  deleteEventRequest,
  fetchEventByIdRequest,
  fetchMyEventsRequest,
  fetchPublicEventsRequest,
  joinEventRequest,
  leaveEventRequest,
  updateEventRequest,
} from "../api/eventsApi";

type EventsState = {
  publicEvents: EventItem[];
  // Includes both organized and joined events for the current user.
  myEvents: EventItem[];
  selectedEvent: EventItem | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
  assistantAnswer: string | null;
  assistantStatus: "idle" | "loading" | "failed";
  assistantError: string | null;
};

const initialState: EventsState = {
  publicEvents: [],
  myEvents: [],
  selectedEvent: null,
  status: "idle",
  error: null,
  assistantAnswer: null,
  assistantStatus: "idle",
  assistantError: null,
};

export const askAssistantQuestion = createAsyncThunk(
  "events/askAssistantQuestion",
  async (question: string, { getState }) => {
    const state = getState() as RootState;
    const response = await askAssistantQuestionRequest(
      question,
      state.auth.token,
    );

    return {
      question,
      answer: response.answer,
    };
  },
);

export const fetchPublicEvents = createAsyncThunk(
  "events/fetchPublic",
  async () => {
    return fetchPublicEventsRequest();
  },
);

export const fetchEventById = createAsyncThunk(
  "events/fetchById",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;
    return fetchEventByIdRequest(eventId, state.auth.token);
  },
);

export const fetchMyEvents = createAsyncThunk(
  "events/fetchMyEvents",
  async (_, { getState }) => {
    const state = getState() as RootState;
    return fetchMyEventsRequest(state.auth.token);
  },
);

export const createEvent = createAsyncThunk(
  "events/createEvent",
  async (payload: CreateEventPayload, { getState }) => {
    const state = getState() as RootState;
    return createEventRequest(payload, state.auth.token);
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
    return updateEventRequest(payload, state.auth.token);
  },
);

export const deleteEvent = createAsyncThunk(
  "events/deleteEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;
    await deleteEventRequest(eventId, state.auth.token);

    return eventId;
  },
);

export const joinEvent = createAsyncThunk(
  "events/joinEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;
    await joinEventRequest(eventId, state.auth.token);

    return eventId;
  },
);

export const leaveEvent = createAsyncThunk(
  "events/leaveEvent",
  async (eventId: string, { getState }) => {
    const state = getState() as RootState;
    await leaveEventRequest(eventId, state.auth.token);

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
        // Clear user-specific data after logout.
        state.myEvents = [];
        state.selectedEvent = null;
        state.error = null;
        state.status = "idle";
        state.assistantAnswer = null;
        state.assistantError = null;
        state.assistantStatus = "idle";
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

        // Keep list and details views in sync after edit.
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
      })
      .addCase(askAssistantQuestion.pending, (state) => {
        state.assistantStatus = "loading";
        state.assistantError = null;
        state.assistantAnswer = null;
      })
      .addCase(askAssistantQuestion.fulfilled, (state, action) => {
        state.assistantStatus = "idle";
        state.assistantError = null;
        state.assistantAnswer = action.payload.answer;
      })
      .addCase(askAssistantQuestion.rejected, (state) => {
        state.assistantStatus = "failed";
        state.assistantAnswer = null;
        state.assistantError = "Failed to get assistant answer";
      });
  },
});

export const eventsReducer = eventsSlice.reducer;
