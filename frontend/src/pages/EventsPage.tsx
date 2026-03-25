import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  askAssistantQuestion,
  fetchPublicEvents,
} from "../features/events/eventsSlice";
import { useEventFilters } from "../features/events/useEventFilters";
import { AssistantPanel } from "../components/assistant/AssistantPanel";
import { EventCardGrid } from "../components/event-details/EventCardGrid";
import { EventTagFilterBar } from "../components/event-details/EventTagFilterBar";
import { SearchIcon } from "../components/ui/icons/SearchIcon";

const ASSISTANT_QUESTION_SUGGESTIONS = [
  "What events am I attending this week?",
  "When is my next event?",
  "List all events I organize.",
  "Show public tech events this weekend.",
  "Who’s attending the Marketing Meetup?",
  "Where is the Design Sprint?",
];

export function EventsPage() {
  const dispatch = useAppDispatch();
  const { publicEvents, status, error } = useAppSelector(
    (state) => state.events,
  );
  const token = useAppSelector((state) => state.auth.token);
  const {
    searchTerm,
    setSearchTerm,
    selectedTags,
    availableTags,
    filteredEvents,
    toggleTag,
  } = useEventFilters(publicEvents);

  useEffect(() => {
    // Public feed is visible to all users.
    void dispatch(fetchPublicEvents());
  }, [dispatch]);

  const handleAssistantSubmit = async (question: string) => {
    if (!token) {
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
          suggestedQuestions={ASSISTANT_QUESTION_SUGGESTIONS}
          onSubmit={handleAssistantSubmit}
        />
      ) : null}

      <EventTagFilterBar
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />

      {status === "loading" ? <p className="mt-6">Loading events...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      {filteredEvents.length === 0 && status !== "loading" ? (
        <p className="mt-6 text-slate-600">
          {selectedTags.length > 0
            ? "No events match the selected tags."
            : "No events found."}
        </p>
      ) : null}

      <EventCardGrid events={filteredEvents} />
    </div>
  );
}
