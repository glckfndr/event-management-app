import { formatDateTimeUtc } from './assistant-text.helpers';
import type { AssistantEvent } from './assistant.types';

export const formatFilteredCount = (title: string, count: number): string => {
  return `${title}: ${count} event${count === 1 ? '' : 's'}.`;
};

export const formatEventList = (
  events: AssistantEvent[],
  title: string,
): string => {
  if (events.length === 0) {
    return `${title}: none.`;
  }

  const conciseList = events
    .slice(0, 8)
    .map((event) => `${event.title} (${formatDateTimeUtc(event.eventDate)})`)
    .join('; ');

  return `${title}: ${conciseList}.`;
};
