import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyEvents } from "../features/events/eventsSlice";

export function MyEventsPage() {
  const dispatch = useAppDispatch();
  const myEvents = useAppSelector((state) => state.events.myEvents);

  useEffect(() => {
    void dispatch(fetchMyEvents());
  }, [dispatch]);

  const grouped = myEvents.reduce<Record<string, typeof myEvents>>(
    (acc, event) => {
      const dateKey = new Date(event.eventDate).toISOString().slice(0, 10);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {},
  );

  const dates = Object.keys(grouped).sort();

  return (
    <div>
      <h2 className="text-2xl font-bold">My Events</h2>
      <p className="mt-2 text-sm text-slate-600">
        Calendar view of events you organize or joined.
      </p>

      {dates.length === 0 ? <p className="mt-6">No events yet.</p> : null}

      <div className="mt-6 grid gap-4">
        {dates.map((date) => (
          <section
            key={date}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 className="text-lg font-semibold">
              {new Date(date).toDateString()}
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {grouped[date].map((event) => (
                <article
                  key={event.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-slate-600">
                    {new Date(event.eventDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-slate-600">
                    {event.location || "Location TBD"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
