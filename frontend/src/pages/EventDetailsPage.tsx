import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";
import { VisibilityFieldset } from "../components/ui/VisibilityFieldset";
import { EditIcon } from "../components/ui/icons/EditIcon";
import { TrashIcon } from "../components/ui/icons/TrashIcon";

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
  const location = useLocation();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.events.selectedEvent);
  const eventsStatus = useAppSelector((state) => state.events.status);
  const eventsError = useAppSelector((state) => state.events.error);
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const returnTo =
    (location.state as { from?: string } | undefined)?.from || "/events";

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

  const participantLabel = (
    participant: {
      userId: string;
      user?: { name?: string; email?: string };
    },
    index: number,
  ): string => {
    if (participant.user?.name?.trim()) {
      return participant.user.name;
    }

    return `participant ${index + 1}`;
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
      navigate(returnTo);
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
          {participantsCount} / {event.capacity == null ? "∞" : event.capacity}{" "}
          participants
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200" />

      <p className="mt-4 text-[1.05rem] text-slate-600">
        Organizer:{" "}
        {event.organizer?.name || event.organizer?.email || "Unknown"}
      </p>

      <div className="mt-5">
        <p className="text-[1.05rem] font-medium text-slate-700">
          Participants
        </p>

        {participantsCount === 0 ? (
          <p className="mt-2 text-[1.05rem] text-slate-600">
            No participants yet.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {event.participants?.map((participant, index) => (
              <span
                key={participant.id}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[1.05rem] font-medium text-slate-700"
              >
                {participantLabel(participant, index)}
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
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleLeave()}
                  className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-lg font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                >
                  Leave
                </Button>
              ) : isFull ? (
                <span className="inline-block rounded-md bg-slate-200 px-3 py-1.5 text-lg font-semibold text-slate-600">
                  Full
                </span>
              ) : (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleJoin()}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Join
                </Button>
              )
            ) : null}

            {isOrganizer ? (
              <>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setIsEditing((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-100 px-3 py-1.5 text-lg font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                >
                  <EditIcon className="shrink-0" />
                  Edit
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-lg font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                >
                  <TrashIcon className="shrink-0" />
                  Delete
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => navigate(returnTo)}
                  className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-lg font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                >
                  ← Back
                </Button>
              </>
            ) : null}
          </>
        ) : null}

        {!isOrganizer ? (
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => navigate(returnTo)}
            className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-lg font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
          >
            ← Back
          </Button>
        ) : null}
      </div>

      {error ? <FormErrorText className="mt-4">{error}</FormErrorText> : null}

      {isOrganizer && isEditing ? (
        <form className="mt-6 grid gap-6" onSubmit={handleEditSubmit}>
          <div className="grid gap-2">
            <label
              htmlFor="edit-title"
              className="text-[1.05rem] font-semibold text-slate-800"
            >
              Title
            </label>
            <input
              id="edit-title"
              value={editTitle}
              onChange={(inputEvent) => setEditTitle(inputEvent.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Title"
              required
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="edit-description"
              className="text-[1.05rem] font-semibold text-slate-800"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(inputEvent) =>
                setEditDescription(inputEvent.target.value)
              }
              className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Description"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor="edit-date"
                className="text-[1.05rem] font-semibold text-slate-800"
              >
                Date
              </label>
              <input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(inputEvent) => setEditDate(inputEvent.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
                required
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="edit-time"
                className="text-[1.05rem] font-semibold text-slate-800"
              >
                Time
              </label>
              <input
                id="edit-time"
                type="time"
                value={editTime}
                onChange={(inputEvent) => setEditTime(inputEvent.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="edit-location"
              className="text-[1.05rem] font-semibold text-slate-800"
            >
              Location
            </label>
            <input
              id="edit-location"
              value={editLocation}
              onChange={(inputEvent) =>
                setEditLocation(inputEvent.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Location"
              required
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="edit-capacity"
              className="text-[1.05rem] font-semibold text-slate-800"
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
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] text-slate-700 placeholder:text-slate-400"
              placeholder="Capacity (optional)"
            />
          </div>
          <VisibilityFieldset
            publicControl={
              <input
                type="radio"
                name="edit-visibility"
                value="public"
                checked={editVisibility === "public"}
                onChange={() => setEditVisibility("public")}
              />
            }
            privateControl={
              <input
                type="radio"
                name="edit-visibility"
                value="private"
                checked={editVisibility === "private"}
                onChange={() => setEditVisibility("private")}
              />
            }
          />

          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <Button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setError(null);
                setIsEditing(false);
              }}
              className="rounded-xl border border-slate-300 px-4 py-3 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-[1.05rem] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Save changes
            </Button>
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
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-lg font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
              >
                <TrashIcon className="shrink-0" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
