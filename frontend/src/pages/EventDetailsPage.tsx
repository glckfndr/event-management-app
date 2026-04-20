import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchEventById } from "../features/events/model/eventsSlice";
import { EventDetailsInteractionSection } from "../features/events/ui/event-details/EventDetailsInteractionSection";
import { EventDetailsSummary } from "../features/events/ui/event-details/EventDetailsSummary";
import { AsyncSection } from "../components/layout/AsyncSection";
import { getSafeReturnPath } from "../shared/navigation";

export function EventDetailsPage() {
  const location = useLocation();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.events.selectedEvent);
  const eventsStatus = useAppSelector((state) => state.events.status);
  const eventsError = useAppSelector((state) => state.events.error);
  const returnTo = getSafeReturnPath(
    (location.state as { from?: unknown } | undefined)?.from,
    "/events",
  );
  // Ignore stale store data when route id changes.
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
            participantsCount={currentEvent.participants?.length ?? 0}
          />

          <EventDetailsInteractionSection
            currentEvent={currentEvent}
            returnTo={returnTo}
          />
        </div>
      ) : null}
    </AsyncSection>
  );
}

