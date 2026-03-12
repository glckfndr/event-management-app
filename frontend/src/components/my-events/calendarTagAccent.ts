import type { EventItem } from "../../types/event";

const DEFAULT_ACCENT_CLASS_NAMES =
  "border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200";

const TAG_ACCENT_CLASS_NAMES = [
  "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200",
  "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200",
  "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  "border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200",
  "border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-200",
  "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200",
  "border-teal-200 bg-teal-100 text-teal-800 hover:bg-teal-200",
  "border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-200",
] as const;

const normalizeTagName = (tagName: string | undefined) =>
  (tagName ?? "").trim().toLowerCase();

const hashTagName = (tagName: string) => {
  let hash = 0;

  for (const symbol of tagName) {
    hash = (hash * 31 + symbol.charCodeAt(0)) >>> 0;
  }

  return hash;
};

export const getCalendarEventAccentClassNames = (
  event: Pick<EventItem, "tags">,
) => {
  const firstTagName = normalizeTagName(event.tags?.[0]?.name);

  if (!firstTagName) {
    return DEFAULT_ACCENT_CLASS_NAMES;
  }

  const accentIndex = hashTagName(firstTagName) % TAG_ACCENT_CLASS_NAMES.length;

  return TAG_ACCENT_CLASS_NAMES[accentIndex] ?? DEFAULT_ACCENT_CLASS_NAMES;
};
