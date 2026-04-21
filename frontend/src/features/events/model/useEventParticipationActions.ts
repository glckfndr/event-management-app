import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useAppDispatch } from "../../../app/hooks";
import {
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
} from "./eventsSlice";

type UseEventParticipationActionsOptions = {
  isAuthenticated: boolean;
  navigate: NavigateFunction;
};

export const useEventParticipationActions = ({
  isAuthenticated,
  navigate,
}: UseEventParticipationActionsOptions) => {
  const dispatch = useAppDispatch();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const refreshEvents = async () => {
    // Refresh both lists to keep join/leave UI state consistent.
    await Promise.all([
      dispatch(fetchPublicEvents()).unwrap(),
      dispatch(fetchMyEvents()).unwrap(),
    ]);
  };

  const runEventAction = async (
    eventId: string,
    action: () => Promise<unknown>,
    errorMessage: string,
  ) => {
    // Shared flow for busy/error handling around join/leave operations.
    setActionError(null);
    setBusyEventId(eventId);

    try {
      await action();
      await refreshEvents();
    } catch {
      setActionError(errorMessage);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleJoin = async (eventId: string) => {
    await runEventAction(
      eventId,
      () => dispatch(joinEvent(eventId)).unwrap(),
      "Failed to join event",
    );
  };

  const handleLeave = async (eventId: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    await runEventAction(
      eventId,
      () => dispatch(leaveEvent(eventId)).unwrap(),
      "Failed to leave event",
    );
  };

  return {
    actionError,
    busyEventId,
    handleJoin,
    handleLeave,
  };
};
