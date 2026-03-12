import { describe, expect, it } from "vitest";
import {
  getEventFirstTagAccentClassNames,
  getTagAccentClassNames,
} from "./tagAccent";

describe("tagAccent", () => {
  it("uses default soft accent for empty tag", () => {
    const classNames = getTagAccentClassNames(undefined, "soft");

    expect(classNames).toContain("bg-indigo-100");
    expect(classNames).toContain("text-indigo-700");
  });

  it("uses default solid accent for empty tag", () => {
    const classNames = getTagAccentClassNames("", "solid");

    expect(classNames).toContain("bg-indigo-600");
    expect(classNames).toContain("text-white");
  });

  it("maps same tag to same color deterministically", () => {
    const first = getTagAccentClassNames("Tech", "soft");
    const second = getTagAccentClassNames("Tech", "soft");

    expect(first).toBe(second);
  });

  it("normalizes tag case and spacing", () => {
    const normalized = getTagAccentClassNames("tech", "soft");
    const mixedCase = getTagAccentClassNames("  TeCh  ", "soft");

    expect(normalized).toBe(mixedCase);
  });

  it("uses first event tag for event accent", () => {
    const byFirstTag = getEventFirstTagAccentClassNames(
      {
        tags: [
          { id: "t-1", name: "Music" },
          { id: "t-2", name: "Tech" },
        ],
      },
      "soft",
    );

    const bySameFirstTag = getEventFirstTagAccentClassNames(
      {
        tags: [
          { id: "t-3", name: "Music" },
          { id: "t-4", name: "Art" },
        ],
      },
      "soft",
    );

    expect(byFirstTag).toBe(bySameFirstTag);
  });
});
