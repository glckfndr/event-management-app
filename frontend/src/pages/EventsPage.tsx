import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchPublicEvents } from "../features/events/eventsSlice";

export function EventsPage() {
  const dispatch = useAppDispatch();
  const { publicEvents, status, error } = useAppSelector(
    (state) => state.events,
  );

  useEffect(() => {
    void dispatch(fetchPublicEvents());
  }, [dispatch]);

  return (
    <div>
      <h2 className="text-2xl font-bold">Public Events</h2>
      <p className="mt-2 text-sm text-slate-600">Browse all public events.</p>

      {status === "loading" ? <p className="mt-6">Loading events...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {publicEvents.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 className="text-lg font-semibold">{event.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {new Date(event.eventDate).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {event.location || "Location TBD"}
            </p>
            <Link
              to={`/events/${event.id}`}
              className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              View details
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
