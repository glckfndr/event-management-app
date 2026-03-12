import type { EventItem } from "../../types/event";
import { getEventFirstTagAccentClassNames } from "../../shared/tagAccent";

export const getCalendarEventAccentClassNames = (
  event: Pick<EventItem, "tags">,
) => getEventFirstTagAccentClassNames(event, "soft");
