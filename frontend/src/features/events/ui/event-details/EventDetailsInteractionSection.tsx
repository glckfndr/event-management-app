import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchMyEvents } from "../../model/eventsSlice";
import { useEventDetailsActions } from "../../model/useEventDetailsActions";
import type { EventItem } from "../../../../types/event";
import { Button } from "../../../../components/ui/Button";
import { FormErrorText } from "../../../../components/ui/FormErrorText";
import { EditIcon } from "../../../../components/ui/icons/EditIcon";
import { TrashIcon } from "../../../../components/ui/icons/TrashIcon";
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
  const deleteDialogCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const deleteDialogTitleId = useId();
  const deleteDialogDescriptionId = useId();

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

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return;
    }

    const handleEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !isBusy) {
        setIsDeleteModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDeleteModalOpen, isBusy, setIsDeleteModalOpen]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    deleteDialogCancelButtonRef.current?.focus();

    return () => {
      const previouslyFocusedElement = previouslyFocusedElementRef.current;

      if (
        previouslyFocusedElement &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isDeleteModalOpen]);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {token ? (
          <>
            {/* Participants can join/leave unless they are the organizer. */}
            {!isOrganizer ? (
              isJoined ? (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleLeave()}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  Leave
                </Button>
              ) : isFull ? (
                <span className="inline-block rounded-xl bg-slate-200 px-4 py-2.5 text-[1.05rem] font-semibold text-slate-700">
                  Full
                </span>
              ) : (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleJoin()}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[1.05rem] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
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
                  onClick={handleToggleEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-100 px-4 py-2.5 text-[1.05rem] font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                >
                  <EditIcon className="shrink-0" />
                  Edit
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2.5 text-[1.05rem] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                >
                  <TrashIcon className="shrink-0" />
                  Delete
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => navigate(returnTo)}
                  className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-[1.05rem] font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
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
            className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-[1.05rem] font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
          >
            ← Back
          </Button>
        ) : null}
      </div>

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => {
            if (!isBusy) {
              setIsDeleteModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
            aria-describedby={deleteDialogDescriptionId}
          >
            <h3
              id={deleteDialogTitleId}
              className="text-lg font-semibold text-slate-900"
            >
              Confirm deletion
            </h3>
            <p
              id={deleteDialogDescriptionId}
              className="mt-2 text-sm text-slate-700"
            >
              Are you sure you want to delete this event?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                ref={deleteDialogCancelButtonRef}
                disabled={isBusy}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2.5 text-[1.05rem] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
              >
                <TrashIcon className="shrink-0" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
