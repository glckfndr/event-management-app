import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import type { CreateEventPayload, EventVisibility } from "../types/event";
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";
import {
  EventDateTimePickerField,
  EventTextareaField,
  EventTextInputField,
} from "../components/event-form/EventFormFields";
import {
  EVENT_DESCRIPTION_MIN_LENGTH,
  EVENT_LOCATION_MIN_LENGTH,
  EVENT_TITLE_MIN_LENGTH,
  EVENT_VALIDATION_MESSAGES,
  isValidPositiveCapacityInput,
} from "../shared/eventValidation";
import { VisibilityFieldset } from "../components/ui/VisibilityFieldset";

const createEventSchema = yup
  .object({
    title: yup
      .string()
      .trim()
      .min(
        EVENT_TITLE_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.createTitleMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.createTitleRequired),
    description: yup
      .string()
      .trim()
      .min(
        EVENT_DESCRIPTION_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.descriptionMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.descriptionRequired),
    eventDate: yup.string().required(EVENT_VALIDATION_MESSAGES.dateRequired),
    eventTime: yup.string().required(EVENT_VALIDATION_MESSAGES.timeRequired),
    location: yup
      .string()
      .trim()
      .min(
        EVENT_LOCATION_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.locationMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.locationRequired),
    capacity: yup
      .string()
      .test(
        "valid-capacity",
        EVENT_VALIDATION_MESSAGES.createCapacityPositive,
        (value) => isValidPositiveCapacityInput(value),
      ),
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
        <EventTextInputField
          label="Event Title"
          required
          errorMessage={errors.title?.message}
          placeholder="e.g., Tech Conference 2025"
          {...register("title")}
        />

        <EventTextareaField
          label="Description"
          required
          errorMessage={errors.description?.message}
          placeholder="Describe what makes your event special..."
          rows={4}
          {...register("description")}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="eventDate"
            control={control}
            render={({ field }) => (
              <EventDateTimePickerField
                label="Date"
                required
                errorMessage={errors.eventDate?.message}
                mode="date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            name="eventTime"
            control={control}
            render={({ field }) => (
              <EventDateTimePickerField
                label="Time"
                required
                errorMessage={errors.eventTime?.message}
                mode="time"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>

        <EventTextInputField
          label="Location"
          required
          errorMessage={errors.location?.message}
          placeholder="e.g., Convention Center, San Francisco"
          {...register("location")}
        />

        <EventTextInputField
          label="Capacity (optional)"
          errorMessage={errors.capacity?.message}
          hint={
            <p className="text-sm text-slate-500">
              Maximum number of participants. Leave empty for unlimited
              capacity.
            </p>
          }
          type="number"
          min={1}
          placeholder="Leave empty for unlimited"
          {...register("capacity")}
        />

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
