import { type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  askAssistantQuestion,
  fetchPublicEvents,
} from "../features/events/eventsSlice";
import { useEventFilters } from "../features/events/useEventFilters";
import { useAssistantUiStore } from "../features/events/assistantUiStore";
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicEvents, status, error } = useAppSelector(
    (state) => state.events,
  );
  const token = useAppSelector((state) => state.auth.token);
  const assistantQuestion = useAssistantUiStore(
    (state) => state.assistantQuestion,
  );
  const setAssistantQuestion = useAssistantUiStore(
    (state) => state.setAssistantQuestion,
  );
  const recentAssistantQuestions = useAssistantUiStore(
    (state) => state.recentAssistantQuestions,
  );
  const initializeRecentAssistantQuestions = useAssistantUiStore(
    (state) => state.initializeRecentAssistantQuestions,
  );
  const recordAssistantQuestion = useAssistantUiStore(
    (state) => state.recordAssistantQuestion,
  );
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

  useEffect(() => {
    initializeRecentAssistantQuestions();
  }, [initializeRecentAssistantQuestions]);

  const handleAssistantSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();

    if (!token) {
      navigate("/login");
      return;
    }

    // Trimmed value is persisted to recent questions and sent to API.
    const question = assistantQuestion.trim();

    if (!question) {
      return;
    }

    recordAssistantQuestion(question);

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
          suggestedQuestions={ASSISTANT_QUESTION_SUGGESTIONS}
          recentQuestions={recentAssistantQuestions}
          onSetQuestion={setAssistantQuestion}
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
