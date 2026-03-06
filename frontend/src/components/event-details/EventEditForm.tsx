import type { FormEvent } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  parseDateValue,
  parseTimeValue,
  toDateInputValue,
  toTimeInputValue,
} from "../../shared/dateTimeInput";
import type { EventVisibility } from "../../types/event";
import { Button } from "../ui/Button";
import { DatePickerInput } from "../ui/DatePickerInput";
import { VisibilityFieldset } from "../ui/VisibilityFieldset";
import { CalendarIcon } from "../ui/icons/CalendarIcon";
import { ClockIcon } from "../ui/icons/ClockIcon";

export type EventEditFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: string;
  visibility: EventVisibility;
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
      <div className="grid gap-2">
        <label
          htmlFor="edit-title"
          className="text-[1.05rem] font-semibold text-slate-800"
        >
          Title
        </label>
        <input
          id="edit-title"
          value={values.title}
          onChange={(inputEvent) =>
            onFieldChange("title", inputEvent.target.value)
          }
          className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
          placeholder="Title"
          required
        />
      </div>
      <div className="grid gap-2">
        <label
          htmlFor="edit-description"
          className="text-[1.05rem] font-semibold text-slate-800"
        >
          Description
        </label>
        <textarea
          id="edit-description"
          value={values.description}
          onChange={(inputEvent) =>
            onFieldChange("description", inputEvent.target.value)
          }
          className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
          placeholder="Description"
          required
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="edit-date"
            className="text-[1.05rem] font-semibold text-slate-800"
          >
            Date
          </label>
          <DatePicker
            id="edit-date"
            selected={parseDateValue(values.date)}
            onChange={(selectedDate) =>
              onFieldChange(
                "date",
                selectedDate ? toDateInputValue(selectedDate) : "",
              )
            }
            placeholderText="Select a date"
            dateFormat="MMM d, yyyy"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-[1.05rem] text-slate-700"
            calendarClassName="event-datepicker"
            popperClassName="event-datepicker-popper"
            wrapperClassName="w-full"
            customInput={
              <DatePickerInput icon={<CalendarIcon className="h-5 w-5" />} />
            }
          />
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="edit-time"
            className="text-[1.05rem] font-semibold text-slate-800"
          >
            Time
          </label>
          <DatePicker
            id="edit-time"
            selected={parseTimeValue(values.time)}
            onChange={(selectedTime) =>
              onFieldChange(
                "time",
                selectedTime ? toTimeInputValue(selectedTime) : "",
              )
            }
            placeholderText="Select time"
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="HH:mm"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-[1.05rem] text-slate-700"
            calendarClassName="event-datepicker"
            popperClassName="event-timepicker-popper"
            wrapperClassName="w-full"
            customInput={
              <DatePickerInput icon={<ClockIcon className="h-5 w-5" />} />
            }
          />
        </div>
      </div>
      <div className="grid gap-2">
        <label
          htmlFor="edit-location"
          className="text-[1.05rem] font-semibold text-slate-800"
        >
          Location
        </label>
        <input
          id="edit-location"
          value={values.location}
          onChange={(inputEvent) =>
            onFieldChange("location", inputEvent.target.value)
          }
          className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
          placeholder="Location"
          required
        />
      </div>
      <div className="grid gap-2">
        <label
          htmlFor="edit-capacity"
          className="text-[1.05rem] font-semibold text-slate-800"
        >
          Capacity (optional)
        </label>
        <input
          id="edit-capacity"
          type="number"
          min={1}
          value={values.capacity}
          onChange={(inputEvent) =>
            onFieldChange("capacity", inputEvent.target.value)
          }
          className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
          placeholder="Capacity (optional)"
        />
      </div>
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
