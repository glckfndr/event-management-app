import type { EventItem } from "../../types/event";
import { getEventFirstTagAccentClassNames } from "../../features/events/lib/tagAccent";

export const getCalendarEventAccentClassNames = (
  event: Pick<EventItem, "tags">,
) => getEventFirstTagAccentClassNames(event, "soft");
