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
    if (!token) {
      navigate("/login");
      return;
    }

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

      <div className="relative mt-8 max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-slate-400">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M20 20L16.65 16.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          value={searchTerm}
          onChange={(inputEvent) => setSearchTerm(inputEvent.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
          placeholder="Search events..."
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
              <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold lowercase text-indigo-700">
                organizer
              </span>
            ) : null}

            <h3 className="text-[1.6rem] font-semibold text-slate-900 hover:text-indigo-600">
              {event.title}
            </h3>
            <p className="mt-[0.675rem] text-lg text-slate-500">
              {shortDescription(event.description)}
            </p>

            <div className="mt-5 space-y-2 text-lg text-slate-500">
              <p className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="text-slate-500"
                >
                  <path
                    d="M8 3V6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 3V6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                </svg>
                {new Date(event.eventDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="text-slate-500"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 7V12L15.5 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {new Date(event.eventDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="text-slate-500"
                >
                  <path
                    d="M12 21C16 17 19 14 19 10.5C19 6.91015 15.866 4 12 4C8.13401 4 5 6.91015 5 10.5C5 14 8 17 12 21Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10.5"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                {event.location || "Location TBD"}
              </p>
              <p className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="text-slate-500"
                >
                  <path
                    d="M16 11C17.6569 11 19 9.65685 19 8C19 6.34315 17.6569 5 16 5C14.3431 5 13 6.34315 13 8C13 9.65685 14.3431 11 16 11Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12C9.65685 12 11 10.6569 11 9C11 7.34315 9.65685 6 8 6C6.34315 6 5 7.34315 5 9C5 10.6569 6.34315 12 8 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 18C3.6 15.8 5.5 14.5 8 14.5C10.5 14.5 12.4 15.8 13 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 17.5C13.45 16.05 14.75 15 16.5 15C18.25 15 19.55 16.05 20 17.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {event.participants?.length ?? 0} /{" "}
                {event.capacity == null ? "∞" : event.capacity} participants
              </p>
            </div>

            <div className="mt-4 border-t border-slate-200" />

            {!(
              Boolean(currentUserEmail) &&
              currentUserEmail === event.organizer?.email
            ) ? (
              <p className="mt-4 text-[1.05rem] text-slate-600">
                organizer:{" "}
                {event.organizer?.name || event.organizer?.email || "Unknown"}
              </p>
            ) : null}

            <div className="mt-4" onClick={(evt) => evt.stopPropagation()}>
              {Boolean(currentUserEmail) &&
              currentUserEmail === event.organizer?.email ? null : token &&
                joinedEventIds.has(event.id) ? (
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
