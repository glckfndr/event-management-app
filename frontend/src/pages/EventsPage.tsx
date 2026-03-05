import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
} from "../features/events/eventsSlice";

export function EventsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicEvents, myEvents, status, error } = useAppSelector(
    (state) => state.events,
  );
  const token = useAppSelector((state) => state.auth.token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents],
  );

  useEffect(() => {
    void dispatch(fetchPublicEvents());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  const shortDescription = (description?: string) => {
    if (!description) {
      return "No description";
    }

    if (description.length <= 120) {
      return description;
    }

    return `${description.slice(0, 117)}...`;
  };

  const handleJoin = async (eventId: string) => {
    setActionError(null);
    setBusyEventId(eventId);

    try {
      await dispatch(joinEvent(eventId)).unwrap();
      await Promise.all([
        dispatch(fetchPublicEvents()).unwrap(),
        dispatch(fetchMyEvents()).unwrap(),
      ]);
    } catch {
      setActionError("Failed to join event");
    } finally {
      setBusyEventId(null);
    }
  };

  const handleLeave = async (eventId: string) => {
    setActionError(null);
    setBusyEventId(eventId);

    try {
      await dispatch(leaveEvent(eventId)).unwrap();
      await Promise.all([
        dispatch(fetchPublicEvents()).unwrap(),
        dispatch(fetchMyEvents()).unwrap(),
      ]);
    } catch {
      setActionError("Failed to leave event");
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold">Public Events</h2>
      <p className="mt-2 text-sm text-slate-600">Browse all public events.</p>

      {status === "loading" ? <p className="mt-6">Loading events...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}
      {actionError ? <p className="mt-6 text-red-600">{actionError}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {publicEvents.map((event) => (
          <article
            key={event.id}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            <h3 className="text-lg font-semibold">{event.title}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {shortDescription(event.description)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {new Date(event.eventDate).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {event.location || "Location TBD"}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium">Organizer:</span>{" "}
              {event.organizer?.name || event.organizer?.email || "Unknown"}
            </p>

            <div className="mt-3 grid gap-1 text-sm text-slate-700">
              <p>
                <span className="font-medium">Capacity:</span>{" "}
                {event.capacity == null ? "Unlimited" : event.capacity}
              </p>
              <p>
                <span className="font-medium">Participants:</span>{" "}
                {event.participants?.length ?? 0}
              </p>
            </div>

            {token ? (
              <div className="mt-4" onClick={(evt) => evt.stopPropagation()}>
                {joinedEventIds.has(event.id) ? (
                  <button
                    type="button"
                    disabled={busyEventId === event.id}
                    onClick={() => void handleLeave(event.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Leave
                  </button>
                ) : event.capacity != null &&
                  (event.participants?.length ?? 0) >= event.capacity ? (
                  <span className="inline-block rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">
                    Full
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyEventId === event.id}
                    onClick={() => void handleJoin(event.id)}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Join
                  </button>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
