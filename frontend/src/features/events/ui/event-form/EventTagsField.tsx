import { useMemo, useState } from "react";
import { FormField } from "../../../../components/ui/FormField";
import {
  EVENT_MAX_TAGS,
  EVENT_VALIDATION_MESSAGES,
} from "../../lib/eventValidation";
import { getTagAccentClassNames } from "../../../../shared/tagAccent";

const PRESET_TAGS = ["Tech", "Art", "Business", "Music", "Marketing"];

type EventTagsFieldProps = {
  label?: string;
  errorMessage?: string;
  value: string[];
  onChange: (nextValue: string[]) => void;
  id?: string;
};

const normalizeTag = (tag: string) => tag.trim();

const dedupeTagsCaseInsensitive = (tags: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags.map(normalizeTag).filter(Boolean)) {
    const canonical = tag.toLowerCase();

    if (seen.has(canonical)) {
      continue;
    }

    seen.add(canonical);
    result.push(tag);
  }

  return result;
};

export function EventTagsField({
  label = "Tags",
  errorMessage,
  value,
  onChange,
  id,
}: EventTagsFieldProps) {
  const [customTag, setCustomTag] = useState("");

  const selectedTags = useMemo(() => dedupeTagsCaseInsensitive(value), [value]);

  const canAddMore = selectedTags.length < EVENT_MAX_TAGS;

  const setNextTags = (nextTags: string[]) => {
    onChange(dedupeTagsCaseInsensitive(nextTags));
  };

  const togglePresetTag = (tag: string) => {
    const exists = selectedTags.some(
      (selected) => selected.toLowerCase() === tag.toLowerCase(),
    );

    if (exists) {
      setNextTags(
        selectedTags.filter(
          (selected) => selected.toLowerCase() !== tag.toLowerCase(),
        ),
      );
      return;
    }

    if (!canAddMore) {
      return;
    }

    setNextTags([...selectedTags, tag]);
  };

  const addCustomTag = () => {
    const normalized = normalizeTag(customTag);

    if (!normalized || !canAddMore) {
      return;
    }

    const exists = selectedTags.some(
      (selected) => selected.toLowerCase() === normalized.toLowerCase(),
    );

    if (exists) {
      setCustomTag("");
      return;
    }

    setNextTags([...selectedTags, normalized]);
    setCustomTag("");
  };

  return (
    <FormField
      label={label}
      htmlFor={id}
      errorMessage={errorMessage}
      hint={
        <p className="text-sm text-slate-500">
          Select up to {EVENT_MAX_TAGS} tags.
        </p>
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map((tag) => {
            const isSelected = selectedTags.some(
              (selected) => selected.toLowerCase() === tag.toLowerCase(),
            );

            return (
              <button
                key={tag}
                type="button"
                onClick={() => togglePresetTag(tag)}
                disabled={!isSelected && !canAddMore}
                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                  isSelected
                    ? getTagAccentClassNames(tag, "solid")
                    : `${getTagAccentClassNames(tag, "soft")} disabled:opacity-50`
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            id={id}
            type="text"
            value={customTag}
            onChange={(inputEvent) => setCustomTag(inputEvent.target.value)}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === "Enter") {
                keyboardEvent.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Add custom tag"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={addCustomTag}
            disabled={!canAddMore}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {selectedTags.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() =>
                  setNextTags(
                    selectedTags.filter(
                      (selected) =>
                        selected.toLowerCase() !== tag.toLowerCase(),
                    ),
                  )
                }
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${getTagAccentClassNames(
                  tag,
                  "soft",
                )}`}
                title="Remove tag"
              >
                {tag} x
              </button>
            ))}
          </div>
        )}

        {selectedTags.length >= EVENT_MAX_TAGS ? (
          <p className="text-sm text-amber-700">
            {EVENT_VALIDATION_MESSAGES.tagsMaxCount}
          </p>
        ) : null}
      </div>
    </FormField>
  );
}
