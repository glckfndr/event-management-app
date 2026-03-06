import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import type { CreateEventPayload, EventVisibility } from "../types/event";
import { Button } from "../components/ui/Button";

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
        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="e.g., Tech Conference 2025"
            {...register("title")}
          />
          {errors.title ? (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="Describe what makes your event special..."
            rows={4}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-[1.05rem] font-semibold text-slate-800">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
              type="date"
              {...register("eventDate")}
            />
            {errors.eventDate ? (
              <p className="text-sm text-red-600">{errors.eventDate.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-[1.05rem] font-semibold text-slate-800">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
              type="time"
              {...register("eventTime")}
            />
            {errors.eventTime ? (
              <p className="text-sm text-red-600">{errors.eventTime.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="e.g., Convention Center, San Francisco"
            {...register("location")}
          />
          {errors.location ? (
            <p className="text-sm text-red-600">{errors.location.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Capacity (optional)
          </label>
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            type="number"
            min={1}
            placeholder="Leave empty for unlimited"
            {...register("capacity")}
          />
          {errors.capacity ? (
            <p className="text-sm text-red-600">{errors.capacity.message}</p>
          ) : null}
          <p className="text-sm text-slate-500">
            Maximum number of participants. Leave empty for unlimited capacity.
          </p>
        </div>

        <div className="grid gap-3">
          <p className="text-[1.05rem] font-semibold text-slate-800">
            Visibility
          </p>

          <label className="flex items-center gap-2 text-[1.05rem] text-slate-700">
            <input type="radio" value="public" {...register("visibility")} />
            Public - Anyone can see and join this event
          </label>

          <label className="flex items-center gap-2 text-[1.05rem] text-slate-700">
            <input type="radio" value="private" {...register("visibility")} />
            Private - Only invited people can see this event
          </label>
          {errors.visibility ? (
            <p className="text-sm text-red-600">{errors.visibility.message}</p>
          ) : null}
        </div>

        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {submitError ? (
            <p className="md:col-span-2 text-sm text-red-600">{submitError}</p>
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
