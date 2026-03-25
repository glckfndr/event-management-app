import { useNavigate } from "react-router-dom";
import { EventCard } from "./EventCard";
import type { Event } from "../../types";

export interface EventCardGridProps {
  events: Event[];
  token: string | null;
  currentUserEmail: string | undefined;
  joinedEventIds: Set<string>;
  busyEventId: string | null;
  actionError: string | null;
  onJoin: (eventId: string) => Promise<void>;
  onLeave: (eventId: string) => Promise<void>;
}

export function EventCardGrid({
  events,
  token,
  currentUserEmail,
  joinedEventIds,
  busyEventId,
  actionError,
  onJoin,
  onLeave,
}: EventCardGridProps) {
  const navigate = useNavigate();

  return (
    <>
      {actionError ? <p className="mt-6 text-red-600">{actionError}</p> : null}

      {events.length === 0 ? (
        <p className="mt-6 text-slate-600">No events found.</p>
      ) : null}

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
              onJoin: () => void onJoin(event.id),
              onLeave: () => void onLeave(event.id),
              onRequireLogin: () => navigate("/login"),
            }}
          />
        ))}
      </div>
    </>
  );
}
