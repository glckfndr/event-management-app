import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  createEventSchema,
  type CreateEventFormValues,
} from "../features/events/lib/createEventFormSchema";
import { createEvent } from "../features/events/model/eventsSlice";
import type { CreateEventPayload } from "../types/event";
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";
import {
  EventTagsField,
  EventTextareaField,
  EventTextInputField,
} from "../features/events/ui/event-form/EventFormFields";
import { renderDateTimeField } from "../features/events/ui/event-form/renderDateTimeField";
import { getSafeReturnPath } from "../shared/navigation";
import { VisibilityFieldset } from "../components/ui/VisibilityFieldset";

export function CreateEventPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const status = useAppSelector((state) => state.events.status);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const returnTo = getSafeReturnPath(
    (location.state as { from?: unknown } | undefined)?.from,
    "/events",
  );

  const selectedDate = searchParams.get("date");

  // Calendar shortcuts can prefill date/time defaults.
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
      tags: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      // Remove non-string values defensively before sending payload.
      const normalizedTags = (values.tags ?? []).filter(
        (tag): tag is string => typeof tag === "string",
      );

      // Backend expects a single ISO datetime value.
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
        tags: normalizedTags,
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
    <div className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
      <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
        Create New Event
      </h2>
      <p className="mt-2 text-base text-slate-500 md:text-lg">
        Fill in the details to create an amazing event
      </p>

      <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
        <EventTextInputField
          label="Event Title"
          required
          dense
          errorMessage={errors.title?.message}
          placeholder="e.g., Tech Conference 2025"
          {...register("title")}
        />

        <EventTextareaField
          label="Description"
          required
          dense
          errorMessage={errors.description?.message}
          placeholder="Describe what makes your event special..."
          rows={3}
          {...register("description")}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            name="eventDate"
            control={control}
            render={({ field }) =>
              renderDateTimeField({
                label: "Date",
                mode: "date",
                value: field.value,
                onChange: (nextValue) => field.onChange(nextValue),
                onBlur: field.onBlur,
                dense: true,
                errorMessage: errors.eventDate?.message,
              })
            }
          />

          <Controller
            name="eventTime"
            control={control}
            render={({ field }) =>
              renderDateTimeField({
                label: "Time",
                mode: "time",
                value: field.value,
                onChange: (nextValue) => field.onChange(nextValue),
                onBlur: field.onBlur,
                dense: true,
                errorMessage: errors.eventTime?.message,
              })
            }
          />
        </div>

        <EventTextInputField
          label="Location"
          required
          dense
          errorMessage={errors.location?.message}
          placeholder="e.g., Convention Center, San Francisco"
          {...register("location")}
        />

        <EventTextInputField
          label="Capacity (optional)"
          dense
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
          className="grid gap-2"
          publicControl={
            <input type="radio" value="public" {...register("visibility")} />
          }
          privateControl={
            <input type="radio" value="private" {...register("visibility")} />
          }
          errorMessage={errors.visibility?.message}
        />

        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <EventTagsField
              id="create-tags"
              value={(field.value ?? []).filter(
                (tag): tag is string => typeof tag === "string",
              )}
              onChange={field.onChange}
              errorMessage={errors.tags?.message}
            />
          )}
        />

        <div className="mt-1 grid gap-2 md:grid-cols-2">
          {submitError ? (
            <FormErrorText className="md:col-span-2">
              {submitError}
            </FormErrorText>
          ) : null}
          <Button
            type="button"
            onClick={() => navigate(returnTo)}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {status === "loading" ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}

