import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  deleteEvent,
  fetchEventById,
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
  updateEvent,
} from "../features/events/eventsSlice";

export function EventDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.events.selectedEvent);
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((item) => item.id)),
    [myEvents],
  );

  useEffect(() => {
    if (id) {
      void dispatch(fetchEventById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (!event) {
      return;
    }

    setEditTitle(event.title);
    setEditDescription(event.description ?? "");
    setEditDateTime(event.eventDate.slice(0, 16));
    setEditLocation(event.location ?? "");
    setEditCapacity(
      event.capacity == null || Number.isNaN(event.capacity)
        ? ""
        : String(event.capacity),
    );
  }, [event]);

  if (!id) {
    return <p>Event id is missing.</p>;
  }

  if (!event || event.id !== id) {
    return <p>Loading event details...</p>;
  }

  const isOrganizer =
    Boolean(currentUserEmail) && currentUserEmail === event.organizer?.email;
  const isJoined = joinedEventIds.has(event.id);
  const participantsCount = event.participants?.length ?? 0;
  const isFull =
    event.capacity != null &&
    Number.isFinite(event.capacity) &&
    participantsCount >= event.capacity;

  const participantLabel = (participant: {
    userId: string;
    user?: { name?: string; email: string };
  }) => {
    if (participant.user?.name?.trim()) {
      return participant.user.name;
    }

    if (participant.user?.email) {
      const username = participant.user.email.split("@")[0];
      return username.length <= 2
        ? username.toUpperCase()
        : username.slice(0, 2).toUpperCase();
    }

    return participant.userId.slice(0, 2).toUpperCase();
  };

  const refreshEventData = async () => {
    await dispatch(fetchEventById(event.id)).unwrap();

    if (token) {
      await dispatch(fetchMyEvents()).unwrap();
    }
  };

  const handleJoin = async () => {
    setError(null);
    setIsBusy(true);

    try {
      await dispatch(joinEvent(event.id)).unwrap();
      await refreshEventData();
    } catch {
      setError("Failed to join event");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeave = async () => {
    setError(null);
    setIsBusy(true);

    try {
      await dispatch(leaveEvent(event.id)).unwrap();
      await refreshEventData();
    } catch {
      setError("Failed to leave event");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteModalOpen(false);
    setError(null);
    setIsBusy(true);

    try {
      await dispatch(deleteEvent(event.id)).unwrap();
      await dispatch(fetchPublicEvents()).unwrap();
      navigate("/events");
    } catch {
      setError("Failed to delete event");
      setIsBusy(false);
    }
  };

  const handleEditSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!editTitle.trim() || !editDateTime) {
      setError("Title and date/time are required");
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      await dispatch(
        updateEvent({
          eventId: event.id,
          data: {
            title: editTitle.trim(),
            description: editDescription.trim() || undefined,
            eventDate: new Date(editDateTime).toISOString(),
            location: editLocation.trim() || undefined,
            capacity: editCapacity === "" ? null : Number(editCapacity),
          },
        }),
      ).unwrap();

      await refreshEventData();
      setIsEditing(false);
    } catch {
      setError("Failed to update event");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-[1.6rem] font-semibold text-slate-900">
        {event.title}
      </h2>
      <p className="mt-[0.675rem] text-lg text-slate-500">
        {event.description || "No description"}
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
          👥 {participantsCount} /{" "}
          {event.capacity == null ? "∞" : event.capacity} participants
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200" />

      <p className="mt-4 text-[1.05rem] text-slate-600">
        Organizer:{" "}
        {event.organizer?.name || event.organizer?.email || "Unknown"}
      </p>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700">Participants</p>

        {participantsCount === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No participants yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {event.participants?.map((participant) => (
              <span
                key={participant.id}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {participantLabel(participant)}
              </span>
            ))}
          </div>
        )}
      </div>

      {token ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {!isOrganizer ? (
            isJoined ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleLeave()}
                className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-lg font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
              >
                Leave
              </button>
            ) : isFull ? (
              <span className="inline-block rounded-md bg-slate-200 px-3 py-1.5 text-lg font-semibold text-slate-600">
                Full
              </span>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleJoin()}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Join
              </button>
            )
          ) : null}

          {isOrganizer ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsEditing((value) => !value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-lg font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {isOrganizer && isEditing ? (
        <form className="mt-6 grid gap-3" onSubmit={handleEditSubmit}>
          <input
            value={editTitle}
            onChange={(inputEvent) => setEditTitle(inputEvent.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
            placeholder="Title"
            required
          />
          <textarea
            value={editDescription}
            onChange={(inputEvent) =>
              setEditDescription(inputEvent.target.value)
            }
            className="min-h-24 rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
            placeholder="Description"
          />
          <input
            type="datetime-local"
            value={editDateTime}
            onChange={(inputEvent) => setEditDateTime(inputEvent.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
            required
          />
          <input
            value={editLocation}
            onChange={(inputEvent) => setEditLocation(inputEvent.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
            placeholder="Location"
          />
          <input
            type="number"
            min={1}
            value={editCapacity}
            onChange={(inputEvent) => setEditCapacity(inputEvent.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
            placeholder="Capacity (optional)"
          />

          <button
            type="submit"
            disabled={isBusy}
            className="w-fit rounded-md bg-emerald-600 px-3 py-1.5 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Save changes
          </button>
        </form>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Confirm deletion
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Are you sure you want to delete this event?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleDelete()}
                className="rounded-md border border-red-300 px-3 py-1.5 text-lg font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
