import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createEvent } from "../features/events/eventsSlice";
import type { CreateEventPayload, EventVisibility } from "../types/event";

type CreateEventFormValues = {
  title: string;
  description: string;
  eventDate: string;
  location: string;
  capacity: string;
  visibility: EventVisibility;
};

export function CreateEventPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.events.status);

  const { register, handleSubmit } = useForm<CreateEventFormValues>({
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      location: "",
      capacity: "",
      visibility: "public",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: CreateEventPayload = {
      title: values.title,
      description: values.description || undefined,
      eventDate: values.eventDate,
      location: values.location || undefined,
      visibility: values.visibility,
      capacity: values.capacity ? Number(values.capacity) : null,
    };

    await dispatch(createEvent(payload)).unwrap();
    navigate("/events");
  });

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-bold">Create Event</h2>
      <p className="mt-2 text-sm text-slate-600">
        Create a new event as organizer.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Title"
          {...register("title", { required: true })}
        />

        <textarea
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Description"
          rows={4}
          {...register("description")}
        />

        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          type="datetime-local"
          {...register("eventDate", { required: true })}
        />

        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Location"
          {...register("location")}
        />

        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          type="number"
          min={1}
          placeholder="Capacity (optional)"
          {...register("capacity")}
        />

        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          {...register("visibility")}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {status === "loading" ? "Creating..." : "Create event"}
        </button>
      </form>
    </div>
  );
}
