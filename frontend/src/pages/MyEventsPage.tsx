import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyEvents } from "../features/events/eventsSlice";
import { CalendarMonthNavigator } from "../components/my-events/CalendarMonthNavigator";
import { CalendarViewToggle } from "../components/my-events/CalendarViewToggle";
import { CalendarWeekHeader } from "../components/my-events/CalendarWeekHeader";
import { MonthCalendarGrid } from "../components/my-events/MonthCalendarGrid";
import { WeekCalendarGrid } from "../components/my-events/WeekCalendarGrid";
import { groupEventsByDate } from "../components/my-events/calendarUtils";

export function MyEventsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const myEvents = useAppSelector((state) => state.events.myEvents);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    void dispatch(fetchMyEvents());
  }, [dispatch]);

  const eventsByDate = useMemo(() => groupEventsByDate(myEvents), [myEvents]);

  const monthCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const gridStart = new Date(monthStart);

    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    // Render a fixed 6x7 grid to keep month layout stable.
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      return date;
    });
  }, [currentMonth]);

  const weekCells = useMemo(() => {
    const today = new Date();
    const sameMonth =
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear();
    // Week view anchors on current week for current month, otherwise month start.
    const referenceDate = sameMonth
      ? today
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const start = new Date(referenceDate);

    start.setDate(referenceDate.getDate() - referenceDate.getDay());

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return date;
    });
  }, [currentMonth]);

  const hasAnyEvents = useMemo(
    () => Object.keys(eventsByDate).length > 0,
    [eventsByDate],
  );

  const title = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const changeMonth = (delta: number) => {
    setCurrentMonth(
      (previousMonth) =>
        new Date(
          previousMonth.getFullYear(),
          previousMonth.getMonth() + delta,
          1,
        ),
    );
  };

  const openEventFromCalendar = (eventId: string) => {
    void navigate(`/events/${eventId}`, {
      state: { from: "/my-events" },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-4xl font-bold">My Events</h2>
          <p className="mt-2 text-lg text-slate-600">
            View and manage your event calendar
          </p>
          {!hasAnyEvents ? (
            <p className="mt-3 text-lg text-slate-600">
              You are not part of any events yet. Explore public events and
              join.
            </p>
          ) : null}
        </div>

        <Link
          to={
            selectedDateKey
              ? `/events/create?date=${selectedDateKey}`
              : "/events/create"
          }
          state={{ from: "/my-events" }}
          className="rounded-md bg-indigo-600 px-4 py-2 text-lg font-medium text-white hover:bg-indigo-500"
        >
          + Create Event
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <CalendarMonthNavigator
          title={title}
          onPreviousMonth={() => changeMonth(-1)}
          onNextMonth={() => changeMonth(1)}
        />

        <CalendarViewToggle
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
        />
      </div>

      {viewMode === "month" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <CalendarWeekHeader />
          <MonthCalendarGrid
            monthCells={monthCells}
            currentMonth={currentMonth}
            selectedDateKey={selectedDateKey}
            eventsByDate={eventsByDate}
            onSelectDate={setSelectedDateKey}
            onOpenEvent={openEventFromCalendar}
          />
        </div>
      ) : (
        <WeekCalendarGrid
          weekCells={weekCells}
          selectedDateKey={selectedDateKey}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDateKey}
          onOpenEvent={openEventFromCalendar}
        />
      )}
    </div>
  );
}
