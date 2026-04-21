import type { FormEvent } from "react";
import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useAppDispatch } from "../../../app/hooks";
import type { EventEditFormValues } from "../ui/event-details/EventEditForm";
import {
  EVENT_MAX_TAGS,
  EVENT_VALIDATION_MESSAGES,
  normalizeEventCoreValues,
  validateEventCoreFields,
} from "../lib/eventValidation";
import type { EventItem } from "../../../types/event";
import {
  deleteEvent,
  fetchEventById,
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
  updateEvent,
} from "./eventsSlice";

type UseEventDetailsActionsParams = {
  currentEvent: EventItem | null;
  isAuthenticated: boolean;
  returnTo: string;
  navigate: NavigateFunction;
  participantsCount: number;
  editForm: EventEditFormValues;
  onEditFinished: () => void;
};

export const useEventDetailsActions = ({
  currentEvent,
  isAuthenticated,
  returnTo,
  navigate,
  participantsCount,
  editForm,
  onEditFinished,
}: UseEventDetailsActionsParams) => {
  const dispatch = useAppDispatch();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEventData = async () => {
    if (!currentEvent) {
      return;
    }

    await dispatch(fetchEventById(currentEvent.id)).unwrap();

    if (isAuthenticated) {
      await dispatch(fetchMyEvents()).unwrap();
    }
  };

  const runBusyAction = async (
    action: () => Promise<unknown>,
    errorMessage: string,
    onSuccess?: () => Promise<void> | void,
  ) => {
    // Centralize async action lifecycle for all detail-page mutations.
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
    if (!currentEvent) {
      return;
    }

    await runBusyAction(
      () => dispatch(joinEvent(currentEvent.id)).unwrap(),
      "Failed to join event",
      refreshEventData,
    );
  };

  const handleLeave = async () => {
    if (!currentEvent) {
      return;
    }

    await runBusyAction(
      () => dispatch(leaveEvent(currentEvent.id)).unwrap(),
      "Failed to leave event",
      refreshEventData,
    );
  };

  const handleDelete = async () => {
    if (!currentEvent) {
      return;
    }

    setIsDeleteModalOpen(false);

    await runBusyAction(
      () => dispatch(deleteEvent(currentEvent.id)).unwrap(),
      "Failed to delete event",
      async () => {
        await dispatch(fetchPublicEvents()).unwrap();
        navigate(returnTo);
      },
    );
  };

  const handleEditSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    if (!currentEvent) {
      return;
    }

    submitEvent.preventDefault();

    const validationError = validateEventCoreFields(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    const {
      title: normalizedTitle,
      description: normalizedDescription,
      date: normalizedDate,
      time: normalizedTime,
      location: normalizedLocation,
      capacity: normalizedCapacity,
      visibility: normalizedVisibility,
    } = normalizeEventCoreValues(editForm);

    const normalizedTags = [
      ...new Set(editForm.tags.map((tag) => tag.trim()).filter(Boolean)),
    ];

    if (normalizedTags.length > EVENT_MAX_TAGS) {
      setError(EVENT_VALIDATION_MESSAGES.tagsMaxCount);
      return;
    }

    const parsedDateTime = new Date(`${normalizedDate}T${normalizedTime}`);

    if (Number.isNaN(parsedDateTime.getTime())) {
      setError("Date or time is invalid");
      return;
    }

    if (parsedDateTime.getTime() <= Date.now()) {
      setError("Event date and time cannot be in the past");
      return;
    }

    const capacityValue =
      normalizedCapacity === "" ? null : Number(normalizedCapacity);

    if (
      capacityValue != null &&
      Number.isFinite(participantsCount) &&
      participantsCount > capacityValue
    ) {
      // Prevent organizer from setting capacity below already joined users.
      setError("Capacity cannot be less than current participants count");
      return;
    }

    await runBusyAction(
      () =>
        dispatch(
          updateEvent({
            eventId: currentEvent.id,
            data: {
              title: normalizedTitle,
              description: normalizedDescription || undefined,
              eventDate: parsedDateTime.toISOString(),
              location: normalizedLocation,
              capacity: capacityValue,
              visibility: normalizedVisibility,
              tags: normalizedTags,
            },
          }),
        ).unwrap(),
      "Failed to update event",
      async () => {
        await refreshEventData();
        onEditFinished();
      },
    );
  };

  return {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isBusy,
    error,
    setError,
    handleJoin,
    handleLeave,
    handleDelete,
    handleEditSubmit,
  };
};
