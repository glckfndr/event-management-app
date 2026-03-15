import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchEventById, fetchMyEvents } from "../features/events/eventsSlice";
import { useEventDetailsActions } from "../features/events/useEventDetailsActions";
import { DeleteConfirmModal } from "../components/event-details/DeleteConfirmModal";
import { EventDetailsActions } from "../components/event-details/EventDetailsActions";
import { EventDetailsSummary } from "../components/event-details/EventDetailsSummary";
import { EventEditForm } from "../components/event-details/EventEditForm";
import type { EventEditFormValues } from "../components/event-details/EventEditForm";
import { AsyncSection } from "../components/layout/AsyncSection";
import { FormErrorText } from "../components/ui/FormErrorText";
import { getSafeReturnPath } from "../shared/navigation";
import type { EventItem } from "../types/event";

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
  const returnTo = getSafeReturnPath(
    (location.state as { from?: unknown } | undefined)?.from,
    "/events",
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EventEditFormValues>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: "",
    visibility: "public",
    tags: [],
  });

  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((item) => item.id)),
    [myEvents],
  );
  const currentEvent = event && event.id === id ? event : null;
  const pageError =
    eventsStatus === "failed" && !currentEvent
      ? (eventsError ?? "Failed to load event details")
      : null;
  const isPageLoading = !currentEvent && !pageError;

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

  const updateEditFormField = <K extends keyof EventEditFormValues>(
    field: K,
    value: EventEditFormValues[K],
  ) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const isOrganizer =
    Boolean(currentUserEmail) &&
    currentEvent != null &&
    currentUserEmail === currentEvent.organizer?.email;
  const isJoined = currentEvent != null && joinedEventIds.has(currentEvent.id);
  const participantsCount = currentEvent?.participants?.length ?? 0;
  const isFull =
    currentEvent?.capacity != null &&
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

  const handleToggleEdit = () => {
    setError(null);

    setIsEditing((value) => {
      const nextValue = !value;

      if (nextValue && currentEvent) {
        setEditForm(toEditFormValues(currentEvent));
      }

      return nextValue;
    });
  };

  if (!id) {
    return <p>Event id is missing.</p>;
  }

  return (
    <AsyncSection
      isLoading={isPageLoading}
      loadingFallback={<p>Loading event details...</p>}
      errorMessage={pageError}
      errorFallback={<p>{pageError}</p>}
    >
      {currentEvent ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <EventDetailsSummary
            event={currentEvent}
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
              onToggleEdit: handleToggleEdit,
              onBack: () => navigate(returnTo),
            }}
          />

          {error ? (
            <FormErrorText className="mt-4">{error}</FormErrorText>
          ) : null}

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
      ) : null}
    </AsyncSection>
  );
}
