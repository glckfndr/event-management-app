import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  askAssistantQuestion,
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
} from "../features/events/eventsSlice";
import { EventCard } from "../components/event-details/EventCard";
import { SearchIcon } from "../components/ui/icons/SearchIcon";
import { getTagAccentClassNames } from "../shared/tagAccent";

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

export function EventsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicEvents, myEvents, status, error } = useAppSelector(
    (state) => state.events,
  );
  const assistantAnswer = useAppSelector(
    (state) => state.events.assistantAnswer,
  );
  const assistantStatus = useAppSelector(
    (state) => state.events.assistantStatus,
  );
  const assistantError = useAppSelector((state) => state.events.assistantError);
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [assistantQuestion, setAssistantQuestion] = useState("");

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents],
  );

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

  const filteredEvents = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    const normalizedSelectedTags = selectedTags.map((tag) => tag.toLowerCase());

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
  }, [eventDateSearchById, publicEvents, searchTerm, selectedTags]);

  useEffect(() => {
    void dispatch(fetchPublicEvents());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  useEffect(() => {
    const availableTagSet = new Set(
      availableTags.map((tag) => tag.toLowerCase()),
    );

    setSelectedTags((previous) => {
      const next = previous.filter((tag) =>
        availableTagSet.has(tag.toLowerCase()),
      );

      return next.length === previous.length ? previous : next;
    });
  }, [availableTags]);

  const refreshEvents = async () => {
    await Promise.all([
      dispatch(fetchPublicEvents()).unwrap(),
      dispatch(fetchMyEvents()).unwrap(),
    ]);
  };

  const runEventAction = async (
    eventId: string,
    action: () => Promise<unknown>,
    errorMessage: string,
  ) => {
    setActionError(null);
    setBusyEventId(eventId);

    try {
      await action();
      await refreshEvents();
    } catch {
      setActionError(errorMessage);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleJoin = async (eventId: string) => {
    await runEventAction(
      eventId,
      () => dispatch(joinEvent(eventId)).unwrap(),
      "Failed to join event",
    );
  };

  const handleLeave = async (eventId: string) => {
    if (!token) {
      navigate("/login");
      return;
    }

    await runEventAction(
      eventId,
      () => dispatch(leaveEvent(eventId)).unwrap(),
      "Failed to leave event",
    );
  };

  const toggleTag = (tag: string) => {
    const canonical = tag.toLowerCase();

    setSelectedTags((previous) => {
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

  const handleAssistantSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();

    const question = assistantQuestion.trim();

    if (!question) {
      return;
    }

    await dispatch(askAssistantQuestion(question));
  };

  return (
    <div>
      <h2 className="text-4xl font-bold text-slate-900">Discover Events</h2>
      <p className="mt-3 text-2xl text-slate-500">
        Find and join exciting events happening around you
      </p>

      <div className="relative mt-8 max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-slate-400">
          <SearchIcon />
        </span>
        <input
          value={searchTerm}
          onChange={(inputEvent) => setSearchTerm(inputEvent.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
          placeholder="Search events..."
        />
      </div>

      <section className="mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold text-slate-900">AI Assistant</h3>
        <p className="mt-1 text-sm text-slate-600">
          Ask natural-language questions about your events.
        </p>

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={handleAssistantSubmit}
        >
          <input
            value={assistantQuestion}
            onChange={(inputEvent) =>
              setAssistantQuestion(inputEvent.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
            placeholder="Ask about your events..."
          />
          <button
            type="submit"
            disabled={
              assistantStatus === "loading" ||
              assistantQuestion.trim().length === 0
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assistantStatus === "loading" ? "Asking..." : "Ask"}
          </button>
        </form>

        {assistantStatus === "loading" ? (
          <p className="mt-3 text-sm text-slate-600">
            Getting assistant answer...
          </p>
        ) : null}

        {assistantError ? (
          <p className="mt-3 text-sm text-red-600">{assistantError}</p>
        ) : null}

        {assistantAnswer ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-3" aria-live="polite">
            <p className="text-sm font-semibold text-slate-700">
              Assistant answer
            </p>
            <p className="mt-1 text-sm text-slate-700">{assistantAnswer}</p>
          </div>
        ) : null}
      </section>

      {availableTags.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-600">Filter by tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.some(
                (selected) => selected.toLowerCase() === tag.toLowerCase(),
              );

              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    isSelected
                      ? getTagAccentClassNames(tag, "solid")
                      : getTagAccentClassNames(tag, "soft")
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {status === "loading" ? <p className="mt-6">Loading events...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}
      {actionError ? <p className="mt-6 text-red-600">{actionError}</p> : null}

      {filteredEvents.length === 0 && status !== "loading" ? (
        <p className="mt-6 text-slate-600">
          {selectedTags.length > 0
            ? "No events match the selected tags."
            : "No events found."}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            state={{
              token,
              isOrganizer:
                Boolean(currentUserEmail) &&
                currentUserEmail === event.organizer?.email,
              isJoined: joinedEventIds.has(event.id),
              isBusy: busyEventId === event.id,
            }}
            handlers={{
              onOpen: () => navigate(`/events/${event.id}`),
              onJoin: () => void handleJoin(event.id),
              onLeave: () => void handleLeave(event.id),
              onRequireLogin: () => navigate("/login"),
            }}
          />
        ))}
      </div>
    </div>
  );
}
