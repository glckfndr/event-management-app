import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyEvents } from "../features/events/eventsSlice";
import { MonthCalendarCell } from "../components/my-events/MonthCalendarCell";
import { WeekCalendarCard } from "../components/my-events/WeekCalendarCard";
import { Button } from "../components/ui/Button";
import {
  groupEventsByDate,
  toLocalDateKey,
  weekDays,
} from "../components/my-events/calendarUtils";

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
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
          >
            ‹
          </Button>
          <h3 className="text-4xl font-semibold">{title}</h3>
          <Button
            type="button"
            onClick={() => changeMonth(1)}
            className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
          >
            ›
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white p-1">
          <Button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-md px-4 py-2 text-lg font-medium ${
              viewMode === "month"
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Month
          </Button>
          <Button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-md px-4 py-2 text-lg font-medium ${
              viewMode === "week"
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Week
          </Button>
        </div>
      </div>

      {viewMode === "month" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day) => (
              <p
                key={day}
                className="px-3 py-2 text-center text-lg font-bold text-slate-700"
              >
                {day}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthCells.map((date) => {
              const dateKey = toLocalDateKey(date);

              return (
                <MonthCalendarCell
                  key={`${dateKey}-month`}
                  date={date}
                  events={eventsByDate[dateKey] ?? []}
                  isCurrentMonth={date.getMonth() === currentMonth.getMonth()}
                  isSelected={selectedDateKey === dateKey}
                  onSelect={setSelectedDateKey}
                  onOpenEvent={openEventFromCalendar}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-7">
          {weekCells.map((date) => {
            const dateKey = toLocalDateKey(date);

            return (
              <WeekCalendarCard
                key={`${dateKey}-week`}
                date={date}
                events={eventsByDate[dateKey] ?? []}
                isSelected={selectedDateKey === dateKey}
                onSelect={setSelectedDateKey}
                onOpenEvent={openEventFromCalendar}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
