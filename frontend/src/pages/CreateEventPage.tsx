import { useForm } from "react-hook-form";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import type { CreateEventPayload, EventVisibility } from "../types/event";

type CreateEventFormValues = {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  capacity: string;
  visibility: EventVisibility;
};

export function CreateEventPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAppSelector((state) => state.events.status);

  const selectedDate = searchParams.get("date");

  const defaultEventDate = useMemo(() => selectedDate || "", [selectedDate]);
  const defaultEventTime = useMemo(
    () => (selectedDate ? "10:00" : ""),
    [selectedDate],
  );

  const { register, handleSubmit } = useForm<CreateEventFormValues>({
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

    await dispatch(createEvent(payload)).unwrap();
    navigate("/events");
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
            {...register("title", { required: true })}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="Describe what makes your event special..."
            rows={4}
            {...register("description", { required: true })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-[1.05rem] font-semibold text-slate-800">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
              type="date"
              {...register("eventDate", { required: true })}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-[1.05rem] font-semibold text-slate-800">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
              type="time"
              {...register("eventTime", { required: true })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-[1.05rem] font-semibold text-slate-800">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
            placeholder="e.g., Convention Center, San Francisco"
            {...register("location", { required: true })}
          />
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
        </div>

        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {status === "loading" ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
