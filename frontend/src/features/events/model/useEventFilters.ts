import { useMemo, useState } from "react";
import type { EventItem } from "../../../types/event";

const monthLongFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const monthShortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const time12Formatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const getEventDateSearchText = (eventDate: string) => {
  // Build multiple date/time tokens so free-text search matches flexible input.
  const date = new Date(eventDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const monthLong = monthLongFormatter.format(date);
  const monthShort = monthShortFormatter.format(date);
  const day = String(date.getDate());
  const dayPadded = String(date.getDate()).padStart(2, "0");
  const hour24 = String(date.getHours());
  const hour24Padded = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const time24 = `${hour24Padded}:${minute}`;
  const time12 = time12Formatter.format(date);

  return [
    monthLong,
    monthShort,
    day,
    dayPadded,
    hour24,
    hour24Padded,
    time24,
    time12,
  ]
    .join(" ")
    .toLowerCase();
};

export const useEventFilters = (publicEvents: EventItem[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    const tags: string[] = [];

    for (const event of publicEvents) {
      for (const tag of event.tags ?? []) {
        const normalized = tag.name.trim();

        if (!normalized) {
          continue;
        }

        const canonical = normalized.toLowerCase();

        if (seen.has(canonical)) {
          continue;
        }

        seen.add(canonical);
        tags.push(normalized);
      }
    }

    return tags.sort((first, second) => first.localeCompare(second));
  }, [publicEvents]);

  const eventDateSearchById = useMemo(() => {
    const dateSearchById = new Map<string, string>();

    for (const event of publicEvents) {
      dateSearchById.set(event.id, getEventDateSearchText(event.eventDate));
    }

    return dateSearchById;
  }, [publicEvents]);

  const activeSelectedTags = useMemo(() => {
    const availableTagSet = new Set(
      availableTags.map((tag) => tag.toLowerCase()),
    );

    // Drop tags that no longer exist after a fresh events response.
    return selectedTags.filter((tag) => availableTagSet.has(tag.toLowerCase()));
  }, [availableTags, selectedTags]);

  const filteredEvents = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    const normalizedSelectedTags = activeSelectedTags.map((tag) =>
      tag.toLowerCase(),
    );

    return publicEvents.filter((event) => {
      const eventTags = new Set(
        (event.tags ?? []).map((tag) => tag.name.trim().toLowerCase()),
      );

      const matchesTags =
        normalizedSelectedTags.length === 0 ||
        normalizedSelectedTags.every((tag) => eventTags.has(tag));

      if (!matchesTags) {
        return false;
      }

      if (!value) {
        return true;
      }

      const searchable = [
        event.title,
        event.description,
        event.location,
        event.organizer?.name,
        event.organizer?.email,
        eventDateSearchById.get(event.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [activeSelectedTags, eventDateSearchById, publicEvents, searchTerm]);

  const toggleTag = (tag: string) => {
    const canonical = tag.toLowerCase();

    setSelectedTags((previous) => {
      // Tag selection is case-insensitive but keeps original label casing.
      const exists = previous.some(
        (selected) => selected.toLowerCase() === canonical,
      );

      if (exists) {
        return previous.filter(
          (selected) => selected.toLowerCase() !== canonical,
        );
      }

      return [...previous, tag];
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedTags: activeSelectedTags,
    availableTags,
    filteredEvents,
    toggleTag,
  };
};
