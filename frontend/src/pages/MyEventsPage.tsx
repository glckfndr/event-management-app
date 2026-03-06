import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyEvents } from "../features/events/eventsSlice";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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

  const eventsByDate = useMemo(() => {
    const grouped = myEvents.reduce<Record<string, typeof myEvents>>(
      (accumulator, event) => {
        const dateKey = toLocalDateKey(new Date(event.eventDate));

        if (!accumulator[dateKey]) {
          accumulator[dateKey] = [];
        }

        accumulator[dateKey].push(event);

        return accumulator;
      },
      {},
    );

    Object.values(grouped).forEach((events) => {
      events.sort(
        (first, second) =>
          new Date(first.eventDate).getTime() -
          new Date(second.eventDate).getTime(),
      );
    });

    return grouped;
  }, [myEvents]);

  const monthCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const gridStart = new Date(monthStart);

    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

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

  const visibleCells = viewMode === "month" ? monthCells : weekCells;
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

  const renderEventLabel = (eventDate: string, eventTitle: string) => {
    const time = new Date(eventDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${time} - ${eventTitle}`;
  };

  const renderCell = (date: Date) => {
    const dateKey = toLocalDateKey(date);
    const events = eventsByDate[dateKey] ?? [];
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isSelected = selectedDateKey === dateKey;

    return (
      <div
        key={`${dateKey}-${viewMode}`}
        onClick={() => setSelectedDateKey(dateKey)}
        className={`min-h-[6.75rem] cursor-pointer border-r border-t border-slate-200 p-2 last:border-r-0 ${
          isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-500" : ""
        }`}
      >
        <p
          className={`text-lg font-bold ${isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}
        >
          {date.getDate()}
        </p>

        <div className="mt-2 space-y-1">
          {events.slice(0, 2).map((event) => (
            <button
              type="button"
              key={event.id}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                void navigate(`/events/${event.id}`, {
                  state: { from: "/my-events" },
                });
              }}
              className="w-full truncate rounded bg-indigo-100 px-2 py-1 text-left text-lg text-indigo-700 hover:bg-indigo-200"
              title={renderEventLabel(event.eventDate, event.title)}
            >
              {renderEventLabel(event.eventDate, event.title)}
            </button>
          ))}

          {events.length > 2 ? (
            <p className="text-lg text-slate-500">+{events.length - 2} more</p>
          ) : null}
        </div>
      </div>
    );
  };

  const renderWeekCard = (date: Date) => {
    const dateKey = toLocalDateKey(date);
    const events = eventsByDate[dateKey] ?? [];
    const isSelected = selectedDateKey === dateKey;
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

    return (
      <div
        key={`${dateKey}-week`}
        onClick={() => setSelectedDateKey(dateKey)}
        className={`min-h-[6.75rem] cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 ${
          isSelected ? "ring-2 ring-indigo-500" : ""
        }`}
      >
        <p className="text-lg font-bold text-slate-800">{dayName}</p>
        <p
          className={`mt-1 text-lg ${isSelected ? "text-indigo-600" : "text-slate-500"}`}
        >
          {date.getDate()}
        </p>

        <div className="mt-3 space-y-2">
          {events.length === 0 ? (
            <p className="text-lg text-slate-500">No events</p>
          ) : (
            events.slice(0, 1).map((event) => {
              const time = new Date(event.eventDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    void navigate(`/events/${event.id}`, {
                      state: { from: "/my-events" },
                    });
                  }}
                  className="w-full rounded-lg bg-indigo-100 px-3 py-2 text-left text-indigo-600 hover:bg-indigo-200"
                >
                  <p className="text-lg font-semibold">{time}</p>
                  <p className="truncate text-lg">{event.title}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
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
          className="rounded-md bg-indigo-600 px-4 py-2 text-lg font-medium text-white hover:bg-indigo-500"
        >
          + Create Event
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
          >
            ‹
          </button>
          <h3 className="text-4xl font-semibold">{title}</h3>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-md px-4 py-2 text-lg font-medium ${
              viewMode === "month"
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-md px-4 py-2 text-lg font-medium ${
              viewMode === "week"
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Week
          </button>
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

          <div className="grid grid-cols-7">{visibleCells.map(renderCell)}</div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-7">
          {weekCells.map(renderWeekCard)}
        </div>
      )}
    </div>
  );
}
