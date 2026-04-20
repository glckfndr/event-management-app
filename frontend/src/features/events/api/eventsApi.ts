import { api, getAuthHeader } from "../../../shared/api";
import type { CreateEventPayload, EventItem } from "../../../types/event";

export const askAssistantQuestionRequest = async (
  question: string,
  token: string | null,
) => {
  const response = await api.post<{ answer: string }>(
    "/assistant/questions",
    { question },
    {
      headers: getAuthHeader(token),
    },
  );

  return response.data;
};

export const fetchPublicEventsRequest = async (): Promise<EventItem[]> => {
  const response = await api.get<EventItem[]>("/events");
  return response.data;
};

export const fetchEventByIdRequest = async (
  eventId: string,
  token: string | null,
): Promise<EventItem> => {
  const response = await api.get<EventItem>(`/events/${eventId}`, {
    headers: getAuthHeader(token),
  });

  return response.data;
};

export const fetchMyEventsRequest = async (
  token: string | null,
): Promise<EventItem[]> => {
  const response = await api.get<EventItem[]>("/users/me/events", {
    headers: getAuthHeader(token),
  });

  return response.data;
};

export const createEventRequest = async (
  payload: CreateEventPayload,
  token: string | null,
): Promise<EventItem> => {
  const response = await api.post<EventItem>("/events", payload, {
    headers: getAuthHeader(token),
  });

  return response.data;
};

export const updateEventRequest = async (
  payload: {
    eventId: string;
    data: Partial<CreateEventPayload>;
  },
  token: string | null,
): Promise<EventItem> => {
  const response = await api.patch<EventItem>(
    `/events/${payload.eventId}`,
    payload.data,
    {
      headers: getAuthHeader(token),
    },
  );

  return response.data;
};

export const deleteEventRequest = async (
  eventId: string,
  token: string | null,
): Promise<void> => {
  await api.delete(`/events/${eventId}`, {
    headers: getAuthHeader(token),
  });
};

export const joinEventRequest = async (
  eventId: string,
  token: string | null,
): Promise<void> => {
  await api.post(
    `/events/${eventId}/join`,
    {},
    {
      headers: getAuthHeader(token),
    },
  );
};

export const leaveEventRequest = async (
  eventId: string,
  token: string | null,
): Promise<void> => {
  await api.post(
    `/events/${eventId}/leave`,
    {},
    {
      headers: getAuthHeader(token),
    },
  );
};
