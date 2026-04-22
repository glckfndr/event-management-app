import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../../auth/authSlice";
import type { InvitationItem } from "../../../types/invitation";
import {
  acceptInvitationRequest,
  createInvitationRequest,
  declineInvitationRequest,
  fetchEventInvitationsRequest,
  fetchMyInvitationsRequest,
  revokeInvitationRequest,
} from "../api/invitationsApi";

type InvitationsState = {
  byEventId: Record<string, InvitationItem[]>;
  eventStatusById: Partial<Record<string, "idle" | "loading" | "failed">>;
  myInvitations: InvitationItem[];
  myStatus: "idle" | "loading" | "failed";
  actionStatusByKey: Partial<Record<string, "idle" | "loading" | "failed">>;
  eventErrorById: Partial<Record<string, string | null>>;
  myError: string | null;
  actionError: string | null;
};

const initialState: InvitationsState = {
  byEventId: {},
  eventStatusById: {},
  myInvitations: [],
  myStatus: "idle",
  actionStatusByKey: {},
  eventErrorById: {},
  myError: null,
  actionError: null,
};

const upsertInvitation = (
  invitations: InvitationItem[],
  invitation: InvitationItem,
): InvitationItem[] => {
  const existingIndex = invitations.findIndex(
    (item) => item.id === invitation.id,
  );

  if (existingIndex === -1) {
    return [invitation, ...invitations];
  }

  const next = [...invitations];
  const existingInvitation = next[existingIndex];
  next[existingIndex] = {
    ...existingInvitation,
    ...invitation,
    event: invitation.event ?? existingInvitation.event,
    invitedByUser: invitation.invitedByUser ?? existingInvitation.invitedByUser,
    invitedUser: invitation.invitedUser ?? existingInvitation.invitedUser,
  };
  return next;
};

export const fetchInvitationsForEvent = createAsyncThunk(
  "invitations/fetchForEvent",
  async (eventId: string) => {
    const invitations = await fetchEventInvitationsRequest(eventId);
    return { eventId, invitations };
  },
);

export const createInvitation = createAsyncThunk(
  "invitations/create",
  async (payload: { eventId: string; invitedUserId: string }) => {
    const invitation = await createInvitationRequest(payload);
    return {
      eventId: payload.eventId,
      invitation,
    };
  },
);

export const revokeInvitation = createAsyncThunk(
  "invitations/revoke",
  async (payload: { eventId: string; invitationId: string }) => {
    await revokeInvitationRequest(payload);
    return payload;
  },
);

export const fetchMyInvitations = createAsyncThunk(
  "invitations/fetchMy",
  async () => {
    return fetchMyInvitationsRequest();
  },
);

export const acceptInvitation = createAsyncThunk(
  "invitations/accept",
  async (invitationId: string) => {
    return acceptInvitationRequest(invitationId);
  },
);

export const declineInvitation = createAsyncThunk(
  "invitations/decline",
  async (invitationId: string) => {
    return declineInvitationRequest(invitationId);
  },
);

const invitationsSlice = createSlice({
  name: "invitations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(fetchInvitationsForEvent.pending, (state, action) => {
        state.eventStatusById[action.meta.arg] = "loading";
        state.eventErrorById[action.meta.arg] = null;
        state.actionError = null; // Clear global action error on event invitations load
      })
      .addCase(fetchInvitationsForEvent.fulfilled, (state, action) => {
        state.eventStatusById[action.payload.eventId] = "idle";
        state.byEventId[action.payload.eventId] = action.payload.invitations;
        state.actionError = null; // Also clear error after successful load
      })
      .addCase(fetchInvitationsForEvent.rejected, (state, action) => {
        const eventId = action.meta.arg;
        state.eventStatusById[eventId] = "failed";
        state.eventErrorById[eventId] = "Failed to load invitations";
      })
      .addCase(createInvitation.pending, (state, action) => {
        state.actionStatusByKey[`create:${action.meta.arg.eventId}`] =
          "loading";
        state.actionError = null;
      })
      .addCase(createInvitation.fulfilled, (state, action) => {
        state.actionStatusByKey[`create:${action.payload.eventId}`] = "idle";
        const current = state.byEventId[action.payload.eventId] ?? [];
        state.byEventId[action.payload.eventId] = upsertInvitation(
          current,
          action.payload.invitation,
        );
        state.eventErrorById[action.payload.eventId] = null;
      })
      .addCase(createInvitation.rejected, (state, action) => {
        state.actionStatusByKey[`create:${action.meta.arg.eventId}`] = "failed";
        state.actionError = "Failed to create invitation";
      })
      .addCase(revokeInvitation.pending, (state, action) => {
        state.actionStatusByKey[`revoke:${action.meta.arg.invitationId}`] =
          "loading";
        state.actionError = null;
      })
      .addCase(revokeInvitation.fulfilled, (state, action) => {
        state.actionStatusByKey[`revoke:${action.payload.invitationId}`] =
          "idle";
        const current = state.byEventId[action.payload.eventId] ?? [];
        state.byEventId[action.payload.eventId] = current.filter(
          (invitation) => invitation.id !== action.payload.invitationId,
        );
        state.eventErrorById[action.payload.eventId] = null;
      })
      .addCase(revokeInvitation.rejected, (state, action) => {
        state.actionStatusByKey[`revoke:${action.meta.arg.invitationId}`] =
          "failed";
        state.actionError = "Failed to revoke invitation";
      })
      .addCase(fetchMyInvitations.pending, (state) => {
        state.myStatus = "loading";
        state.myError = null;
        state.actionError = null; // Clear global action error on my invitations load
      })
      .addCase(fetchMyInvitations.fulfilled, (state, action) => {
        state.myStatus = "idle";
        state.myInvitations = action.payload;
      })
      .addCase(fetchMyInvitations.rejected, (state) => {
        state.myStatus = "failed";
        state.myError = "Failed to load my invitations";
      })
      .addCase(acceptInvitation.pending, (state, action) => {
        state.actionStatusByKey[`respond:${action.meta.arg}`] = "loading";
        state.actionError = null;
      })
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.actionStatusByKey[`respond:${action.payload.id}`] = "idle";
        state.myInvitations = upsertInvitation(
          state.myInvitations,
          action.payload,
        );
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.actionStatusByKey[`respond:${action.meta.arg}`] = "failed";
        state.actionError = "Failed to accept invitation";
      })
      .addCase(declineInvitation.pending, (state, action) => {
        state.actionStatusByKey[`respond:${action.meta.arg}`] = "loading";
        state.actionError = null;
      })
      .addCase(declineInvitation.fulfilled, (state, action) => {
        state.actionStatusByKey[`respond:${action.payload.id}`] = "idle";
        state.myInvitations = upsertInvitation(
          state.myInvitations,
          action.payload,
        );
      })
      .addCase(declineInvitation.rejected, (state, action) => {
        state.actionStatusByKey[`respond:${action.meta.arg}`] = "failed";
        state.actionError = "Failed to decline invitation";
      });
  },
});

export const invitationsReducer = invitationsSlice.reducer;
