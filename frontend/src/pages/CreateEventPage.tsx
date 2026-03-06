import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import type { CreateEventPayload, EventVisibility } from "../types/event";
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";
import { FormField } from "../components/ui/FormField";
import { VisibilityFieldset } from "../components/ui/VisibilityFieldset";
import { DatePickerInput } from "../components/ui/DatePickerInput";
import { CalendarIcon } from "../components/ui/icons/CalendarIcon";
import { ClockIcon } from "../components/ui/icons/ClockIcon";
import {
  parseDateValue,
  parseTimeValue,
  toDateInputValue,
  toTimeInputValue,
} from "../shared/dateTimeInput";

const createEventSchema = yup
  .object({
    title: yup
      .string()
      .trim()
      .min(3, "Event title must be at least 3 characters")
      .required("Event title is required"),
    description: yup
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .required("Description is required"),
    eventDate: yup.string().required("Date is required"),
    eventTime: yup.string().required("Time is required"),
    location: yup
      .string()
      .trim()
      .min(2, "Location must be at least 2 characters")
      .required("Location is required"),
    capacity: yup
      .string()
      .test("valid-capacity", "Capacity must be a positive number", (value) => {
        if (!value || value.trim() === "") {
          return true;
        }

        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0;
      }),
    visibility: yup
      .mixed<EventVisibility>()
      .oneOf(["public", "private"], "Select event visibility")
      .required("Visibility is required"),
  })
  .required();

type CreateEventFormValues = yup.InferType<typeof createEventSchema>;

export function CreateEventPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAppSelector((state) => state.events.status);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedDate = searchParams.get("date");

  const defaultEventDate = useMemo(() => selectedDate || "", [selectedDate]);
  const defaultEventTime = useMemo(
    () => (selectedDate ? "10:00" : ""),
    [selectedDate],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: yupResolver(createEventSchema) as Resolver<CreateEventFormValues>,
    defaultValues: {
      title: "",
      description: "",
      eventDate: defaultEventDate,
      eventTime: defaultEventTime,
      location: "",
      capacity: "",
      visibility: "public",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const dateTimeIso = new Date(
        `${values.eventDate}T${values.eventTime || "00:00"}`,
      ).toISOString();

      const payload: CreateEventPayload = {
        title: values.title,
        description: values.description || undefined,
        eventDate: dateTimeIso,
        location: values.location || undefined,
        visibility: values.visibility,
        capacity: values.capacity ? Number(values.capacity) : null,
      };

      const createdEvent = await dispatch(createEvent(payload)).unwrap();
      navigate(createdEvent?.id ? `/events/${createdEvent.id}` : "/events");
    } catch (submitErrorValue) {
      if (submitErrorValue instanceof Error && submitErrorValue.message) {
        setSubmitError(submitErrorValue.message);
        return;
      }

      setSubmitError("Failed to create event. Please try again.");
    }
  });

  return (
    <div className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-8">
      <h2 className="text-4xl font-bold text-slate-900">Create New Event</h2>
      <p className="mt-3 text-lg text-slate-500">
        Fill in the details to create an amazing event
      </p>

      <form className="mt-8 grid gap-6" onSubmit={onSubmit}>
        <FormField
          label="Event Title"
          required
          errorMessage={errors.title?.message}
        >
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="e.g., Tech Conference 2025"
            {...register("title")}
          />
        </FormField>

        <FormField
          label="Description"
          required
          errorMessage={errors.description?.message}
        >
          <textarea
            className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="Describe what makes your event special..."
            rows={4}
            {...register("description")}
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Date"
            required
            errorMessage={errors.eventDate?.message}
          >
            <Controller
              name="eventDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={parseDateValue(field.value)}
                  onChange={(selectedDate) => {
                    field.onChange(
                      selectedDate ? toDateInputValue(selectedDate) : "",
                    );
                  }}
                  onBlur={field.onBlur}
                  placeholderText="Select a date"
                  dateFormat="MMM d, yyyy"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-[1.05rem] text-slate-700"
                  calendarClassName="event-datepicker"
                  popperClassName="event-datepicker-popper"
                  wrapperClassName="w-full"
                  customInput={
                    <DatePickerInput
                      icon={<CalendarIcon className="h-5 w-5" />}
                    />
                  }
                />
              )}
            />
          </FormField>

          <FormField
            label="Time"
            required
            errorMessage={errors.eventTime?.message}
          >
            <Controller
              name="eventTime"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={parseTimeValue(field.value)}
                  onChange={(selectedTime) => {
                    field.onChange(
                      selectedTime ? toTimeInputValue(selectedTime) : "",
                    );
                  }}
                  onBlur={field.onBlur}
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
              )}
            />
          </FormField>
        </div>

        <FormField
          label="Location"
          required
          errorMessage={errors.location?.message}
        >
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="e.g., Convention Center, San Francisco"
            {...register("location")}
          />
        </FormField>

        <FormField
          label="Capacity (optional)"
          errorMessage={errors.capacity?.message}
          hint={
            <p className="text-sm text-slate-500">
              Maximum number of participants. Leave empty for unlimited
              capacity.
            </p>
          }
        >
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            type="number"
            min={1}
            placeholder="Leave empty for unlimited"
            {...register("capacity")}
          />
        </FormField>

        <VisibilityFieldset
          className="grid gap-3"
          publicControl={
            <input type="radio" value="public" {...register("visibility")} />
          }
          privateControl={
            <input type="radio" value="private" {...register("visibility")} />
          }
          errorMessage={errors.visibility?.message}
        />

        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {submitError ? (
            <FormErrorText className="md:col-span-2">
              {submitError}
            </FormErrorText>
          ) : null}
          <Button
            type="button"
            onClick={() => navigate("/events")}
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {status === "loading" ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}
