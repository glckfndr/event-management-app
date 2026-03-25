import type { FormEvent } from "react";
import type { EventVisibility } from "../../types/event";
import {
  EventTagsField,
  EventTextareaField,
  EventTextInputField,
} from "../event-form/EventFormFields";
import { renderDateTimeField } from "../event-form/renderDateTimeField";
import { Button } from "../ui/Button";
import { VisibilityFieldset } from "../ui/VisibilityFieldset";

export type EventEditFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: string;
  visibility: EventVisibility;
  tags: string[];
};

type EventEditFormProps = {
  isBusy: boolean;
  values: EventEditFormValues;
  onFieldChange: <K extends keyof EventEditFormValues>(
    field: K,
    value: EventEditFormValues[K],
  ) => void;
  onCancel: () => void;
  onSubmit: (submitEvent: FormEvent<HTMLFormElement>) => void;
};

export function EventEditForm({
  isBusy,
  values,
  onFieldChange,
  onCancel,
  onSubmit,
}: EventEditFormProps) {
  return (
    <form className="mt-6 grid gap-6" onSubmit={onSubmit}>
      <EventTextInputField
        label="Title"
        required
        id="edit-title"
        value={values.title}
        onChange={(inputEvent) =>
          onFieldChange("title", inputEvent.target.value)
        }
        placeholder="Title"
      />
      <EventTextareaField
        label="Description"
        required
        id="edit-description"
        rows={4}
        value={values.description}
        onChange={(inputEvent) =>
          onFieldChange("description", inputEvent.target.value)
        }
        placeholder="Description"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {renderDateTimeField({
          label: "Date",
          id: "edit-date",
          mode: "date",
          value: values.date,
          onChange: (value) => onFieldChange("date", value),
        })}
        {renderDateTimeField({
          label: "Time",
          id: "edit-time",
          mode: "time",
          value: values.time,
          onChange: (value) => onFieldChange("time", value),
        })}
      </div>
      <EventTextInputField
        label="Location"
        required
        id="edit-location"
        value={values.location}
        onChange={(inputEvent) =>
          onFieldChange("location", inputEvent.target.value)
        }
        placeholder="Location"
      />
      <EventTextInputField
        label="Capacity (optional)"
        id="edit-capacity"
        type="number"
        min={1}
        value={values.capacity}
        onChange={(inputEvent) =>
          onFieldChange("capacity", inputEvent.target.value)
        }
        placeholder="Capacity (optional)"
      />
      <VisibilityFieldset
        publicControl={
          <input
            type="radio"
            name="edit-visibility"
            value="public"
            checked={values.visibility === "public"}
            onChange={() => onFieldChange("visibility", "public")}
          />
        }
        privateControl={
          <input
            type="radio"
            name="edit-visibility"
            value="private"
            checked={values.visibility === "private"}
            onChange={() => onFieldChange("visibility", "private")}
          />
        }
      />

      <EventTagsField
        id="edit-tags"
        value={values.tags}
        onChange={(nextTags) => onFieldChange("tags", nextTags)}
      />

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <Button
          type="button"
          disabled={isBusy}
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
