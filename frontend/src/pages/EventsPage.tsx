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
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents],
  );

  const filteredEvents = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    if (!value) {
      return publicEvents;
    }

    return publicEvents.filter((event) => {
      const searchable = [
        event.title,
        event.description,
        event.location,
        event.organizer?.name,
        event.organizer?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [publicEvents, searchTerm]);

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
      <h2 className="text-4xl font-bold text-slate-900">Discover Events</h2>
      <p className="mt-3 text-2xl text-slate-500">
        Find and join exciting events happening around you
      </p>

      <div className="mt-8 max-w-xl">
        <input
          value={searchTerm}
          onChange={(inputEvent) => setSearchTerm(inputEvent.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
          placeholder="🔍  Search events..."
        />
      </div>

      {status === "loading" ? <p className="mt-6">Loading events...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}
      {actionError ? <p className="mt-6 text-red-600">{actionError}</p> : null}

      {filteredEvents.length === 0 && status !== "loading" ? (
        <p className="mt-6 text-slate-600">No events found.</p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <article
            key={event.id}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            {Boolean(currentUserEmail) &&
            currentUserEmail === event.organizer?.email ? (
              <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                Organizer
              </span>
            ) : null}

            <h3 className="text-[1.6rem] font-semibold text-slate-900 hover:text-indigo-600">
              {event.title}
            </h3>
            <p className="mt-[0.675rem] text-lg text-slate-500">
              {shortDescription(event.description)}
            </p>

            <div className="mt-5 space-y-2 text-lg text-slate-500">
              <p>
                🗓️{" "}
                {new Date(event.eventDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p>
                🕒{" "}
                {new Date(event.eventDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p>📍 {event.location || "Location TBD"}</p>
              <p>
                👥 {event.participants?.length ?? 0} /{" "}
                {event.capacity == null ? "∞" : event.capacity} participants
              </p>
            </div>

            <div className="mt-4 border-t border-slate-200" />

            <p className="mt-4 text-[1.05rem] text-slate-600">
              Organizer:{" "}
              {event.organizer?.name || event.organizer?.email || "Unknown"}
            </p>

            <div className="mt-4" onClick={(evt) => evt.stopPropagation()}>
              {Boolean(currentUserEmail) &&
              currentUserEmail ===
                event.organizer?.email ? null : joinedEventIds.has(event.id) ? (
                <button
                  type="button"
                  disabled={busyEventId === event.id}
                  onClick={() => void handleLeave(event.id)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-[1.05rem] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                >
                  Leave Event
                </button>
              ) : event.capacity != null &&
                (event.participants?.length ?? 0) >= event.capacity ? (
                <span className="inline-block w-full rounded-xl bg-slate-200 px-4 py-2 text-center text-[1.05rem] font-semibold text-slate-600">
                  Full
                </span>
              ) : token ? (
                <button
                  type="button"
                  disabled={busyEventId === event.id}
                  onClick={() => void handleJoin(event.id)}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-[1.05rem] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Join Event
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-[1.05rem] font-semibold text-white hover:bg-emerald-500"
                >
                  Join Event
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
