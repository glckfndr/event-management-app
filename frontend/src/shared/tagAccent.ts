import type { EventItem } from "../types/event";

type TagAccentVariant = "soft" | "solid";

type TagAccentPaletteEntry = {
  soft: string;
  solid: string;
};

const DEFAULT_TAG_ACCENT: TagAccentPaletteEntry = {
  soft: "border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  solid: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500",
};

const TAG_ACCENT_PALETTE: ReadonlyArray<TagAccentPaletteEntry> = [
  {
    soft: "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200",
    solid: "border-rose-600 bg-rose-600 text-white hover:bg-rose-500",
  },
  {
    soft: "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200",
    solid: "border-amber-600 bg-amber-600 text-white hover:bg-amber-500",
  },
  {
    soft: "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    solid: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500",
  },
  {
    soft: "border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200",
    solid: "border-sky-600 bg-sky-600 text-white hover:bg-sky-500",
  },
  {
    soft: "border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-200",
    solid: "border-violet-600 bg-violet-600 text-white hover:bg-violet-500",
  },
  {
    soft: "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200",
    solid: "border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-500",
  },
  {
    soft: "border-teal-200 bg-teal-100 text-teal-800 hover:bg-teal-200",
    solid: "border-teal-600 bg-teal-600 text-white hover:bg-teal-500",
  },
  {
    soft: "border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-200",
    solid: "border-orange-600 bg-orange-600 text-white hover:bg-orange-500",
  },
];

const normalizeTagName = (tagName: string | undefined) =>
  (tagName ?? "").trim().toLowerCase();

const hashTagName = (tagName: string) => {
  let hash = 0;

  for (const symbol of tagName) {
    hash = (hash * 31 + symbol.charCodeAt(0)) >>> 0;
  }

  return hash;
};

const resolveTagAccent = (tagName: string | undefined) => {
  const normalized = normalizeTagName(tagName);

  if (!normalized) {
    return DEFAULT_TAG_ACCENT;
  }

  const accentIndex = hashTagName(normalized) % TAG_ACCENT_PALETTE.length;

  return TAG_ACCENT_PALETTE[accentIndex] ?? DEFAULT_TAG_ACCENT;
};

export const getTagAccentClassNames = (
  tagName: string | undefined,
  variant: TagAccentVariant = "soft",
) => resolveTagAccent(tagName)[variant];

export const getEventFirstTagAccentClassNames = (
  event: Pick<EventItem, "tags">,
  variant: TagAccentVariant = "soft",
) => getTagAccentClassNames(event.tags?.[0]?.name, variant);
