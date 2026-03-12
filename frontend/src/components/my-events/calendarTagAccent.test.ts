import { describe, expect, it } from "vitest";
import { getCalendarEventAccentClassNames } from "./calendarTagAccent";

describe("getCalendarEventAccentClassNames", () => {
  it("uses default accent when event has no tags", () => {
    const classNames = getCalendarEventAccentClassNames({ tags: [] });

    expect(classNames).toContain("bg-indigo-100");
    expect(classNames).toContain("text-indigo-700");
  });

  it("maps first tag deterministically", () => {
    const firstCall = getCalendarEventAccentClassNames({
      tags: [{ id: "1", name: "Tech" }],
    });
    const secondCall = getCalendarEventAccentClassNames({
      tags: [{ id: "2", name: "Tech" }],
    });

    expect(firstCall).toBe(secondCall);
  });

  it("normalizes first tag case and spacing before mapping", () => {
    const normalized = getCalendarEventAccentClassNames({
      tags: [{ id: "1", name: "tech" }],
    });
    const mixedCase = getCalendarEventAccentClassNames({
      tags: [{ id: "2", name: "  TeCh  " }],
    });

    expect(normalized).toBe(mixedCase);
  });

  it("uses only first tag for color mapping", () => {
    const classByFirstTag = getCalendarEventAccentClassNames({
      tags: [
        { id: "1", name: "Music" },
        { id: "2", name: "Tech" },
      ],
    });
    const classBySameFirstTag = getCalendarEventAccentClassNames({
      tags: [
        { id: "3", name: "Music" },
        { id: "4", name: "Art" },
      ],
    });

    expect(classByFirstTag).toBe(classBySameFirstTag);
  });
});
