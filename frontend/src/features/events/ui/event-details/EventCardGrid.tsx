import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchMyEvents } from "../../model/eventsSlice";
import { useEventParticipationActions } from "../../model/useEventParticipationActions";
import { EventCard } from "./EventCard";
import type { EventItem } from "../../../../types/event";

export interface EventCardGridProps {
  events: EventItem[];
}

export function EventCardGrid({ events }: EventCardGridProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const { actionError, busyEventId, handleJoin, handleLeave } =
    useEventParticipationActions({ token, navigate });

  useEffect(() => {
    if (token) {
      void dispatch(fetchMyEvents());
    }
  }, [dispatch, token]);

  // Fast lookup for join-state rendering on each card.
  const joinedEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents],
  );

  return (
    <>
      {actionError ? <p className="mt-6 text-red-600">{actionError}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            state={{
              token,
              isOrganizer:
                Boolean(currentUserEmail) &&
                currentUserEmail === event.organizer?.email,
              isJoined: joinedEventIds.has(event.id),
              isBusy: busyEventId === event.id,
            }}
            handlers={{
              onOpen: () => navigate(`/events/${event.id}`),
              onJoin: () => void handleJoin(event.id),
              onLeave: () => void handleLeave(event.id),
              onRequireLogin: () => navigate("/login"),
            }}
          />
        ))}
      </div>
    </>
  );
}
