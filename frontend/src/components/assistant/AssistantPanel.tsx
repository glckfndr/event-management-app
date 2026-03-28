import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { useAssistantUiStore } from "../../features/events/assistantUiStore";

type AssistantPanelProps = {
  suggestedQuestions: string[];
  onSubmit: (question: string) => void | Promise<void>;
};

export function AssistantPanel({
  suggestedQuestions,
  onSubmit,
}: AssistantPanelProps) {
  // Keep optional sections collapsed by default to reduce visual noise.
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);

  const assistantAnswer = useAppSelector(
    (state) => state.events.assistantAnswer,
  );
  const assistantStatus = useAppSelector(
    (state) => state.events.assistantStatus,
  );
  const assistantError = useAppSelector((state) => state.events.assistantError);
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

  useEffect(() => {
    initializeRecentAssistantQuestions();
  }, [initializeRecentAssistantQuestions]);

  const handleSubmit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    const question = assistantQuestion.trim();

    if (!question) {
      return;
    }

    recordAssistantQuestion(question);
    void onSubmit(question);
  };

  return (
    <section className="mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-xl font-semibold text-slate-900">AI Assistant</h3>
      <p className="mt-1 text-sm text-slate-600">
        Ask natural-language questions about your events.
      </p>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmit}
      >
        <label htmlFor="assistant-question-input" className="sr-only">
          Assistant question
        </label>
        <input
          id="assistant-question-input"
          aria-label="Assistant question"
          value={assistantQuestion}
          onChange={(inputEvent) =>
            setAssistantQuestion(inputEvent.target.value)
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-[1.05rem] text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
          placeholder="Ask about your events..."
        />
        <button
          type="submit"
          disabled={
            // Prevent empty queries and duplicate submit while request is pending.
            assistantStatus === "loading" ||
            assistantQuestion.trim().length === 0
          }
          className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-[1.05rem] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {assistantStatus === "loading" ? "Asking..." : "Ask"}
        </button>
      </form>

      {suggestedQuestions.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsSuggestionsOpen((value) => !value)}
            aria-expanded={isSuggestionsOpen}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span>Try asking</span>
            <span aria-hidden="true">{isSuggestionsOpen ? "▲" : "▼"}</span>
          </button>

          {isSuggestionsOpen ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setAssistantQuestion(question)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {recentAssistantQuestions.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsRecentOpen((value) => !value)}
            aria-expanded={isRecentOpen}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span>Recent questions</span>
            <span aria-hidden="true">{isRecentOpen ? "▲" : "▼"}</span>
          </button>

          {isRecentOpen ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {recentAssistantQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setAssistantQuestion(question)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {assistantStatus === "loading" ? (
        <p className="mt-3 text-sm text-slate-600">
          Getting assistant answer...
        </p>
      ) : null}

      {assistantError ? (
        <p className="mt-3 text-sm text-red-600">{assistantError}</p>
      ) : null}

      <div
        aria-live="polite"
        className={assistantAnswer ? "mt-3 rounded-lg bg-slate-50 p-3" : ""}
      >
        {assistantAnswer ? (
          <>
            <p className="text-sm font-semibold text-slate-700">
              Assistant answer
            </p>
            <p className="mt-1 text-sm text-slate-700">{assistantAnswer}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
