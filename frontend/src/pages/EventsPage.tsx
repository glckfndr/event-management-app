import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  askAssistantQuestion,
  fetchMyEvents,
  fetchPublicEvents,
} from "../features/events/eventsSlice";
import { useEventFilters } from "../features/events/useEventFilters";
import { useEventParticipationActions } from "../features/events/useEventParticipationActions";
import { AssistantPanel } from "../components/assistant/AssistantPanel";
import { EventCard } from "../components/event-details/EventCard";
import { SearchIcon } from "../components/ui/icons/SearchIcon";
import { getTagAccentClassNames } from "../shared/tagAccent";

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
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const {
    searchTerm,
    setSearchTerm,
    selectedTags,
    availableTags,
    filteredEvents,
    toggleTag,
  } = useEventFilters(publicEvents);
  const { actionError, busyEventId, handleJoin, handleLeave } =
    useEventParticipationActions({ token, navigate });

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents],
  );

  useEffect(() => {
    void dispatch(fetchPublicEvents());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  const handleAssistantSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();

    if (!token) {
      navigate("/login");
      return;
    }

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

      {token ? (
        <AssistantPanel
          assistantQuestion={assistantQuestion}
          setAssistantQuestion={setAssistantQuestion}
          assistantStatus={assistantStatus}
          assistantError={assistantError}
          assistantAnswer={assistantAnswer}
          onSubmit={handleAssistantSubmit}
        />
      ) : null}

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
