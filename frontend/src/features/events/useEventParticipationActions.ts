import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import {
  fetchMyEvents,
  fetchPublicEvents,
  joinEvent,
  leaveEvent,
} from "./eventsSlice";

type UseEventParticipationActionsOptions = {
  token: string | null;
  navigate: NavigateFunction;
};

export const useEventParticipationActions = ({
  token,
  navigate,
}: UseEventParticipationActionsOptions) => {
  const dispatch = useAppDispatch();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const refreshEvents = async () => {
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
    if (!token) {
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
