import { api } from "../../../shared/api/client";
import type { CreateEventPayload, EventItem } from "../../../types/event";

export const askAssistantQuestionRequest = async (question: string) => {
  const response = await api.post<{ answer: string }>("/assistant/questions", {
    question,
  });

  return response.data;
};

export const fetchPublicEventsRequest = async (): Promise<EventItem[]> => {
  const response = await api.get<EventItem[]>("/events");
  return response.data;
};

export const fetchEventByIdRequest = async (
  eventId: string,
): Promise<EventItem> => {
  const response = await api.get<EventItem>(`/events/${eventId}`);

  return response.data;
};

export const fetchMyEventsRequest = async (): Promise<EventItem[]> => {
  const response = await api.get<EventItem[]>("/users/me/events");

  return response.data;
};

export const createEventRequest = async (
  payload: CreateEventPayload,
): Promise<EventItem> => {
  const response = await api.post<EventItem>("/events", payload);

  return response.data;
};

export const updateEventRequest = async (payload: {
  eventId: string;
  data: Partial<CreateEventPayload>;
}): Promise<EventItem> => {
  const response = await api.patch<EventItem>(
    `/events/${payload.eventId}`,
    payload.data,
  );

  return response.data;
};

export const deleteEventRequest = async (eventId: string): Promise<void> => {
  await api.delete(`/events/${eventId}`);
};

export const joinEventRequest = async (eventId: string): Promise<void> => {
  await api.post(`/events/${eventId}/join`, {});
};

export const leaveEventRequest = async (eventId: string): Promise<void> => {
  await api.post(`/events/${eventId}/leave`, {});
};
