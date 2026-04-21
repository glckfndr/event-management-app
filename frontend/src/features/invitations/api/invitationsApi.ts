import { api } from "../../../shared/api/client";
import type { InvitationItem } from "../../../types/invitation";

export const fetchEventInvitationsRequest = async (
  eventId: string,
): Promise<InvitationItem[]> => {
  const response = await api.get<InvitationItem[]>(
    `/events/${eventId}/invitations`,
  );
  return response.data;
};

export const createInvitationRequest = async (payload: {
  eventId: string;
  invitedUserId: string;
}): Promise<InvitationItem> => {
  const response = await api.post<InvitationItem>(
    `/events/${payload.eventId}/invitations`,
    {
      invitedUserId: payload.invitedUserId,
    },
  );

  return response.data;
};

export const revokeInvitationRequest = async (payload: {
  eventId: string;
  invitationId: string;
}): Promise<void> => {
  await api.delete(
    `/events/${payload.eventId}/invitations/${payload.invitationId}`,
  );
};

export const fetchMyInvitationsRequest = async (): Promise<
  InvitationItem[]
> => {
  const response = await api.get<InvitationItem[]>("/invitations/me");
  return response.data;
};

export const acceptInvitationRequest = async (
  invitationId: string,
): Promise<InvitationItem> => {
  const response = await api.post<InvitationItem>(
    `/invitations/${invitationId}/accept`,
    {},
  );

  return response.data;
};

export const declineInvitationRequest = async (
  invitationId: string,
): Promise<InvitationItem> => {
  const response = await api.post<InvitationItem>(
    `/invitations/${invitationId}/decline`,
    {},
  );

  return response.data;
};
