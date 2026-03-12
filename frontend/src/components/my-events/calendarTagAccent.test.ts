import { describe, expect, it } from "vitest";
import { getCalendarEventAccentClassNames } from "./calendarTagAccent";

describe("getCalendarEventAccentClassNames", () => {
  it("uses default accent when event has no tags", () => {
    const classNames = getCalendarEventAccentClassNames({ tags: [] });

    expect(classNames).toContain("bg-indigo-100");
    expect(classNames).toContain("text-indigo-700");
  });
});
