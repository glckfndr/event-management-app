import { create } from "zustand";

const MAX_RECENT_ASSISTANT_QUESTIONS = 5;
const RECENT_ASSISTANT_QUESTIONS_STORAGE_KEY =
  "events.recentAssistantQuestions";

type AssistantUiState = {
  assistantQuestion: string;
  recentAssistantQuestions: string[];
  setAssistantQuestion: (value: string) => void;
  initializeRecentAssistantQuestions: () => void;
  recordAssistantQuestion: (question: string) => void;
  resetAssistantUiState: () => void;
};

const sanitizeStoredQuestions = (storedValue: string | null): string[] => {
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_ASSISTANT_QUESTIONS);
  } catch {
    return [];
  }
};

const readRecentQuestionsFromStorage = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(
    RECENT_ASSISTANT_QUESTIONS_STORAGE_KEY,
  );

  const sanitizedQuestions = sanitizeStoredQuestions(storedValue);

  if (sanitizedQuestions.length === 0) {
    window.localStorage.removeItem(RECENT_ASSISTANT_QUESTIONS_STORAGE_KEY);
  }

  return sanitizedQuestions;
};

const persistRecentQuestions = (questions: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  if (questions.length === 0) {
    window.localStorage.removeItem(RECENT_ASSISTANT_QUESTIONS_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    RECENT_ASSISTANT_QUESTIONS_STORAGE_KEY,
    JSON.stringify(questions),
  );
};

export const useAssistantUiStore = create<AssistantUiState>((set) => ({
  assistantQuestion: "",
  recentAssistantQuestions: [],
  setAssistantQuestion: (value) => {
    set({ assistantQuestion: value });
  },
  initializeRecentAssistantQuestions: () => {
    const nextQuestions = readRecentQuestionsFromStorage();

    set((state) => {
      const hasSameLength =
        state.recentAssistantQuestions.length === nextQuestions.length;
      const hasSameValues = hasSameLength
        ? state.recentAssistantQuestions.every(
            (value, index) => value === nextQuestions[index],
          )
        : false;

      if (hasSameValues) {
        return state;
      }

      return { recentAssistantQuestions: nextQuestions };
    });
  },
  recordAssistantQuestion: (question) => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    set((state) => {
      const withoutDuplicates = state.recentAssistantQuestions.filter(
        (value) => value.toLowerCase() !== trimmedQuestion.toLowerCase(),
      );
      const nextQuestions = [trimmedQuestion, ...withoutDuplicates].slice(
        0,
        MAX_RECENT_ASSISTANT_QUESTIONS,
      );

      persistRecentQuestions(nextQuestions);

      return { recentAssistantQuestions: nextQuestions };
    });
  },
  resetAssistantUiState: () => {
    set({ assistantQuestion: "", recentAssistantQuestions: [] });
  },
}));
