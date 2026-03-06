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
import { DeleteConfirmModal } from "../components/event-details/DeleteConfirmModal";
import { EventDetailsActions } from "../components/event-details/EventDetailsActions";
import { EventDetailsSummary } from "../components/event-details/EventDetailsSummary";
import { EventEditForm } from "../components/event-details/EventEditForm";
import type { EventEditFormValues } from "../components/event-details/EventEditForm";
import { FormErrorText } from "../components/ui/FormErrorText";

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
  const [editForm, setEditForm] = useState<EventEditFormValues>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: "",
    visibility: "public",
  });

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

    const { date, time } = toDateAndTimeLocalValues(event.eventDate);
    setEditForm({
      title: event.title,
      description: event.description ?? "",
      date,
      time,
      location: event.location ?? "",
      capacity:
        event.capacity == null || Number.isNaN(event.capacity)
          ? ""
          : String(event.capacity),
      visibility: event.visibility,
    });
  }, [event]);

  const updateEditFormField = <K extends keyof EventEditFormValues>(
    field: K,
    value: EventEditFormValues[K],
  ) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

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

  const refreshEventData = async () => {
    await dispatch(fetchEventById(event.id)).unwrap();

    if (token) {
      await dispatch(fetchMyEvents()).unwrap();
    }
  };

  const runBusyAction = async (
    action: () => Promise<unknown>,
    errorMessage: string,
    onSuccess?: () => Promise<void> | void,
  ) => {
    setError(null);
    setIsBusy(true);

    try {
      await action();

      if (onSuccess) {
        await onSuccess();
      }
    } catch {
      setError(errorMessage);
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoin = async () => {
    await runBusyAction(
      () => dispatch(joinEvent(event.id)).unwrap(),
      "Failed to join event",
      refreshEventData,
    );
  };

  const handleLeave = async () => {
    await runBusyAction(
      () => dispatch(leaveEvent(event.id)).unwrap(),
      "Failed to leave event",
      refreshEventData,
    );
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

    const normalizedTitle = editForm.title.trim();
    const normalizedDescription = editForm.description.trim();
    const normalizedLocation = editForm.location.trim();

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

    if (!editForm.date) {
      setError("Date is required");
      return;
    }

    if (!editForm.time) {
      setError("Time is required");
      return;
    }

    const parsedDateTime = new Date(`${editForm.date}T${editForm.time}`);

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

    if (editForm.capacity !== "") {
      const parsedCapacity = Number(editForm.capacity);

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        setError("Capacity must be a positive whole number");
        return;
      }
    }

    const capacityValue =
      editForm.capacity === "" ? null : Number(editForm.capacity);

    if (
      capacityValue != null &&
      Number.isFinite(participantsCount) &&
      participantsCount > capacityValue
    ) {
      setError("Capacity cannot be less than current participants count");
      return;
    }

    await runBusyAction(
      () =>
        dispatch(
          updateEvent({
            eventId: event.id,
            data: {
              title: normalizedTitle,
              description: normalizedDescription || undefined,
              eventDate: parsedDateTime.toISOString(),
              location: normalizedLocation,
              capacity: capacityValue,
              visibility: editForm.visibility,
            },
          }),
        ).unwrap(),
      "Failed to update event",
      async () => {
        await refreshEventData();
        setIsEditing(false);
      },
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <EventDetailsSummary
        event={event}
        participantsCount={participantsCount}
      />

      <EventDetailsActions
        state={{
          token,
          isOrganizer,
          isJoined,
          isFull,
          isBusy,
        }}
        handlers={{
          onJoin: () => void handleJoin(),
          onLeave: () => void handleLeave(),
          onOpenDelete: () => setIsDeleteModalOpen(true),
          onToggleEdit: () => setIsEditing((value) => !value),
          onBack: () => navigate(returnTo),
        }}
      />

      {error ? <FormErrorText className="mt-4">{error}</FormErrorText> : null}

      {isOrganizer && isEditing ? (
        <EventEditForm
          isBusy={isBusy}
          values={editForm}
          onFieldChange={updateEditFormField}
          onCancel={() => {
            setError(null);
            setIsEditing(false);
          }}
          onSubmit={handleEditSubmit}
        />
      ) : null}

      {isDeleteModalOpen ? (
        <DeleteConfirmModal
          isBusy={isBusy}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </div>
  );
}
