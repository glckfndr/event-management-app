import { getTagAccentClassNames } from "../../lib/tagAccent";

export interface EventTagFilterBarProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function EventTagFilterBar({
  availableTags,
  selectedTags,
  onToggleTag,
}: EventTagFilterBarProps) {
  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-600">Filter by tags</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.some(
            (selected) => selected.toLowerCase() === tag.toLowerCase(),
          );

          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                isSelected
                  ? getTagAccentClassNames(tag, "solid")
                  : getTagAccentClassNames(tag, "soft")
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
