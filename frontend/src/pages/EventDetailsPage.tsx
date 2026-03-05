import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchEventById } from "../features/events/eventsSlice";

export function EventDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.events.selectedEvent);

  useEffect(() => {
    if (id) {
      void dispatch(fetchEventById(id));
    }
  }, [dispatch, id]);

  if (!id) {
    return <p>Event id is missing.</p>;
  }

  if (!event || event.id !== id) {
    return <p>Loading event details...</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-bold">{event.title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        {new Date(event.eventDate).toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {event.location || "Location TBD"}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-slate-700">
        <p>
          <span className="font-medium">Visibility:</span> {event.visibility}
        </p>
        <p>
          <span className="font-medium">Capacity:</span>{" "}
          {event.capacity == null ? "Unlimited" : event.capacity}
        </p>
      </div>

      {event.description ? (
        <p className="mt-4 text-slate-800">{event.description}</p>
      ) : null}
    </div>
  );
}
