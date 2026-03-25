import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyEvents } from "../features/events/eventsSlice";
import { MyEventsCalendarSection } from "../components/my-events/MyEventsCalendarSection";

export function MyEventsPage() {
  const dispatch = useAppDispatch();
  const myEvents = useAppSelector((state) => state.events.myEvents);

  useEffect(() => {
    void dispatch(fetchMyEvents());
  }, [dispatch]);

  return <MyEventsCalendarSection events={myEvents} />;
}
