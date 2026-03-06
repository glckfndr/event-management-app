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
import type { EventVisibility } from "../types/event";

const toDateTimeLocalValue = (isoDate: string) => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toDateAndTimeLocalValues = (isoDate: string) => {
  const localDateTime = toDateTimeLocalValue(isoDate);

  if (!localDateTime.includes("T")) {
    return { date: "", time: "" };
  }

  const [date, time] = localDateTime.split("T");
  return {
    date: date ?? "",
    time: time ?? "",
  };
};

export function EventDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.events.selectedEvent);
  const eventsStatus = useAppSelector((state) => state.events.status);
  const eventsError = useAppSelector((state) => state.events.error);
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editVisibility, setEditVisibility] =
    useState<EventVisibility>("public");

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
    const { date, time } = toDateAndTimeLocalValues(event.eventDate);
    setEditDate(date);
    setEditTime(time);
    setEditLocation(event.location ?? "");
    setEditCapacity(
      event.capacity == null || Number.isNaN(event.capacity)
        ? ""
        : String(event.capacity),
    );
    setEditVisibility(event.visibility);
  }, [event]);

  if (!id) {
    return <p>Event id is missing.</p>;
  }

  if (eventsStatus === "failed" && (!event || event.id !== id)) {
    return <p>{eventsError ?? "Failed to load event details"}</p>;
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

    const normalizedTitle = editTitle.trim();
    const normalizedDescription = editDescription.trim();
    const normalizedLocation = editLocation.trim();

    if (!normalizedTitle) {
      setError("Title is required");
      return;
    }

    if (normalizedTitle.length < 3) {
      setError("Title must be at least 3 characters");
      return;
    }

    if (!normalizedDescription) {
      setError("Description is required");
      return;
    }

    if (normalizedDescription.length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    if (!editDate) {
      setError("Date is required");
      return;
    }

    if (!editTime) {
      setError("Time is required");
      return;
    }

    const parsedDateTime = new Date(`${editDate}T${editTime}`);

    if (Number.isNaN(parsedDateTime.getTime())) {
      setError("Date or time is invalid");
      return;
    }

    if (parsedDateTime.getTime() <= Date.now()) {
      setError("Event date and time cannot be in the past");
      return;
    }

    if (!normalizedLocation) {
      setError("Location is required");
      return;
    }

    if (normalizedLocation.length < 2) {
      setError("Location must be at least 2 characters");
      return;
    }

    if (editCapacity !== "") {
      const parsedCapacity = Number(editCapacity);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        setError("Capacity must be a positive whole number");
        return;
      }
    }

    const capacityValue = editCapacity === "" ? null : Number(editCapacity);

    if (
      capacityValue != null &&
      Number.isFinite(participantsCount) &&
      participantsCount > capacityValue
    ) {
      setError("Capacity cannot be less than current participants count");
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      await dispatch(
        updateEvent({
          eventId: event.id,
          data: {
            title: normalizedTitle,
            description: normalizedDescription || undefined,
            eventDate: parsedDateTime.toISOString(),
            location: normalizedLocation,
            capacity: capacityValue,
            visibility: editVisibility,
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

      <div className="mt-6 flex flex-wrap gap-2">
        {token ? (
          <>
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
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => navigate(-1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  ← Back
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {!isOrganizer ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            ← Back
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {isOrganizer && isEditing ? (
        <form className="mt-6 grid gap-3" onSubmit={handleEditSubmit}>
          <div className="grid gap-1">
            <label
              htmlFor="edit-title"
              className="text-sm font-medium text-slate-700"
            >
              Title
            </label>
            <input
              id="edit-title"
              value={editTitle}
              onChange={(inputEvent) => setEditTitle(inputEvent.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
              placeholder="Title"
              required
            />
          </div>
          <div className="grid gap-1">
            <label
              htmlFor="edit-description"
              className="text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(inputEvent) =>
                setEditDescription(inputEvent.target.value)
              }
              className="min-h-24 rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
              placeholder="Description"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <label
                htmlFor="edit-date"
                className="text-sm font-medium text-slate-700"
              >
                Date
              </label>
              <input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(inputEvent) => setEditDate(inputEvent.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
                required
              />
            </div>
            <div className="grid gap-1">
              <label
                htmlFor="edit-time"
                className="text-sm font-medium text-slate-700"
              >
                Time
              </label>
              <input
                id="edit-time"
                type="time"
                value={editTime}
                onChange={(inputEvent) => setEditTime(inputEvent.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
                required
              />
            </div>
          </div>
          <div className="grid gap-1">
            <label
              htmlFor="edit-location"
              className="text-sm font-medium text-slate-700"
            >
              Location
            </label>
            <input
              id="edit-location"
              value={editLocation}
              onChange={(inputEvent) =>
                setEditLocation(inputEvent.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
              placeholder="Location"
              required
            />
          </div>
          <div className="grid gap-1">
            <label
              htmlFor="edit-capacity"
              className="text-sm font-medium text-slate-700"
            >
              Capacity (optional)
            </label>
            <input
              id="edit-capacity"
              type="number"
              min={1}
              value={editCapacity}
              onChange={(inputEvent) =>
                setEditCapacity(inputEvent.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-[0.35rem] text-lg"
              placeholder="Capacity (optional)"
            />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-slate-700">Visibility</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                value="public"
                checked={editVisibility === "public"}
                onChange={() => setEditVisibility("public")}
              />
              Public - Anyone can see and join this event
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                value="private"
                checked={editVisibility === "private"}
                onChange={() => setEditVisibility("private")}
              />
              Private - Only invited people can see this event
            </label>
          </div>

          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setError(null);
                setIsEditing(false);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
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
