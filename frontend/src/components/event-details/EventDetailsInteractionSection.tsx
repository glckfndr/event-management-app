import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyEvents } from "../../features/events/eventsSlice";
import { useEventDetailsActions } from "../../features/events/useEventDetailsActions";
import type { EventItem } from "../../types/event";
import { FormErrorText } from "../ui/FormErrorText";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EventDetailsActions } from "./EventDetailsActions";
import { EventEditForm } from "./EventEditForm";
import type { EventEditFormValues } from "./EventEditForm";

type EventDetailsInteractionSectionProps = {
  currentEvent: EventItem;
  returnTo: string;
};

const toDateTimeLocalValue = (isoDate: string) => {
  // Convert API ISO timestamps into browser-local input values.
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

const toEditFormValues = (event: EventItem): EventEditFormValues => {
  const { date, time } = toDateAndTimeLocalValues(event.eventDate);

  return {
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
    tags: (event.tags ?? []).map((tag) => tag.name),
  };
};

export function EventDetailsInteractionSection({
  currentEvent,
  returnTo,
}: EventDetailsInteractionSectionProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EventEditFormValues>(
    toEditFormValues(currentEvent),
  );

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((item) => item.id)),
    [myEvents],
  );

  const isOrganizer =
    Boolean(currentUserEmail) &&
    currentUserEmail === currentEvent.organizer?.email;
  const isJoined = joinedEventIds.has(currentEvent.id);
  const participantsCount = currentEvent.participants?.length ?? 0;
  const isFull =
    currentEvent.capacity != null &&
    Number.isFinite(currentEvent.capacity) &&
    participantsCount >= currentEvent.capacity;

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isBusy,
    error,
    setError,
    handleJoin,
    handleLeave,
    handleDelete,
    handleEditSubmit,
  } = useEventDetailsActions({
    currentEvent,
    token,
    returnTo,
    navigate,
    participantsCount,
    editForm,
    onEditFinished: () => setIsEditing(false),
  });

  const updateEditFormField = <K extends keyof EventEditFormValues>(
    field: K,
    value: EventEditFormValues[K],
  ) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleToggleEdit = () => {
    setError(null);

    setIsEditing((value) => {
      const nextValue = !value;

      // Entering edit mode always starts from current server values.
      if (nextValue) {
        setEditForm(toEditFormValues(currentEvent));
      }

      return nextValue;
    });
  };

  return (
    <>
      <EventDetailsActions
        token={token}
        isOrganizer={isOrganizer}
        isJoined={isJoined}
        isFull={isFull}
        isBusy={isBusy}
        onJoin={() => void handleJoin()}
        onLeave={() => void handleLeave()}
        onOpenDelete={() => setIsDeleteModalOpen(true)}
        onToggleEdit={handleToggleEdit}
        onBack={() => navigate(returnTo)}
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
    </>
  );
}
