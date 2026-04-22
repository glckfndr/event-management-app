import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../features/auth/authSlice";
import { eventsReducer } from "../features/events/model/eventsSlice";
import { invitationsReducer } from "../features/invitations/model/invitationsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    invitations: invitationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
