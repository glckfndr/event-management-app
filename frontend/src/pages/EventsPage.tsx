import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
} from "../features/events/eventsSlice";
import { EventCard } from "../components/event-details/EventCard";
import { SearchIcon } from "../components/ui/icons/SearchIcon";

export function EventsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicEvents, myEvents, status, error } = useAppSelector(
    (state) => state.events,
  );
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [publicEvents, searchTerm, selectedTags]);

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
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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
