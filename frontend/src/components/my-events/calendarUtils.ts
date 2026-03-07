import type { EventItem } from "../../types/event";

export const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatEventLabel = (eventDate: string, eventTitle: string) => {
  const time = new Date(eventDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${time} - ${eventTitle}`;
};

export const groupEventsByDate = (events: EventItem[]) => {
  const grouped = events.reduce<Record<string, EventItem[]>>(
    (accumulator, event) => {
      const dateKey = toLocalDateKey(new Date(event.eventDate));

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }

      accumulator[dateKey].push(event);

      return accumulator;
    },
    {},
  );

  Object.values(grouped).forEach((dateEvents) => {
    dateEvents.sort(
      (first, second) =>
        new Date(first.eventDate).getTime() -
        new Date(second.eventDate).getTime(),
    );
  });

  return grouped;
};
