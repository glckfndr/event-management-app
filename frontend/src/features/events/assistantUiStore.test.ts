import { afterEach, describe, expect, it } from "vitest";
import { useAssistantUiStore } from "./assistantUiStore";

afterEach(() => {
  useAssistantUiStore.getState().resetAssistantUiState();
  window.localStorage.clear();
});

describe("assistantUiStore", () => {
  it("loads and sanitizes recent questions from localStorage", () => {
    window.localStorage.setItem(
      "events.recentAssistantQuestions",
      JSON.stringify([
        "  How many events this week?  ",
        42,
        "",
        "Show my public events",
      ]),
    );

    useAssistantUiStore.getState().initializeRecentAssistantQuestions();

    expect(useAssistantUiStore.getState().recentAssistantQuestions).toEqual([
      "How many events this week?",
      "Show my public events",
    ]);
  });

  it("removes corrupted recent questions from localStorage", () => {
    window.localStorage.setItem("events.recentAssistantQuestions", "{invalid");

    useAssistantUiStore.getState().initializeRecentAssistantQuestions();

    expect(useAssistantUiStore.getState().recentAssistantQuestions).toEqual([]);
    expect(
      window.localStorage.getItem("events.recentAssistantQuestions"),
    ).toBeNull();
  });

  it("records deduplicated questions and keeps newest five", () => {
    const { recordAssistantQuestion } = useAssistantUiStore.getState();

    recordAssistantQuestion("First");
    recordAssistantQuestion("Second");
    recordAssistantQuestion("Third");
    recordAssistantQuestion("Fourth");
    recordAssistantQuestion("Fifth");
    recordAssistantQuestion("Sixth");
    recordAssistantQuestion("second");

    expect(useAssistantUiStore.getState().recentAssistantQuestions).toEqual([
      "second",
      "Sixth",
      "Fifth",
      "Fourth",
      "Third",
    ]);
    expect(
      JSON.parse(
        window.localStorage.getItem("events.recentAssistantQuestions") ?? "[]",
      ),
    ).toEqual(["second", "Sixth", "Fifth", "Fourth", "Third"]);
  });
});
