import type { ComponentPropsWithoutRef, ReactNode } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  parseDateValue,
  parseTimeValue,
  toDateInputValue,
  toTimeInputValue,
} from "../../shared/dateTimeInput";
import { FormField } from "../ui/FormField";
import { DatePickerInput } from "../ui/DatePickerInput";
import { CalendarIcon } from "../ui/icons/CalendarIcon";
import { ClockIcon } from "../ui/icons/ClockIcon";

type EventTextInputFieldProps = {
  label: string;
  required?: boolean;
  errorMessage?: string;
  hint?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"input">, "className">;

export function EventTextInputField({
  label,
  required,
  errorMessage,
  hint,
  ...inputProps
}: EventTextInputFieldProps) {
  return (
    <FormField
      label={label}
      required={required}
      errorMessage={errorMessage}
      hint={hint}
    >
      <input
        className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
        {...inputProps}
      />
    </FormField>
  );
}

type EventTextareaFieldProps = {
  label: string;
  required?: boolean;
  errorMessage?: string;
} & Omit<ComponentPropsWithoutRef<"textarea">, "className">;

export function EventTextareaField({
  label,
  required,
  errorMessage,
  ...textareaProps
}: EventTextareaFieldProps) {
  return (
    <FormField label={label} required={required} errorMessage={errorMessage}>
      <textarea
        className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
        {...textareaProps}
      />
    </FormField>
  );
}

type EventDateTimePickerFieldProps = {
  label: string;
  required?: boolean;
  errorMessage?: string;
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
};

export function EventDateTimePickerField({
  label,
  required,
  errorMessage,
  mode,
  value,
  onChange,
  onBlur,
  id,
}: EventDateTimePickerFieldProps) {
  const isDateMode = mode === "date";

  return (
    <FormField label={label} required={required} errorMessage={errorMessage}>
      <DatePicker
        id={id}
        selected={isDateMode ? parseDateValue(value) : parseTimeValue(value)}
        onChange={(selectedValue) => {
          if (!selectedValue) {
            onChange("");
            return;
          }

          onChange(
            isDateMode
              ? toDateInputValue(selectedValue)
              : toTimeInputValue(selectedValue),
          );
        }}
        onBlur={onBlur}
        placeholderText={isDateMode ? "Select a date" : "Select time"}
        dateFormat={isDateMode ? "MMM d, yyyy" : "HH:mm"}
        showTimeSelect={!isDateMode}
        showTimeSelectOnly={!isDateMode}
        timeIntervals={15}
        timeCaption="Time"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-[1.05rem] text-slate-700"
        calendarClassName="event-datepicker"
        popperClassName={
          isDateMode ? "event-datepicker-popper" : "event-timepicker-popper"
        }
        wrapperClassName="w-full"
        customInput={
          <DatePickerInput
            icon={
              isDateMode ? (
                <CalendarIcon className="h-5 w-5" />
              ) : (
                <ClockIcon className="h-5 w-5" />
              )
            }
          />
        }
      />
    </FormField>
  );
}
