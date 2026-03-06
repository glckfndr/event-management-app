import type { EventItem } from "../../types/event";
import { Button } from "../ui/Button";
import { toLocalDateKey } from "./calendarUtils";

type WeekCalendarCardProps = {
  date: Date;
  events: EventItem[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
};

export function WeekCalendarCard({
  date,
  events,
  isSelected,
  onSelect,
  onOpenEvent,
}: WeekCalendarCardProps) {
  const dateKey = toLocalDateKey(date);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div
      onClick={() => onSelect(dateKey)}
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
              <Button
                type="button"
                key={event.id}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onOpenEvent(event.id);
                }}
                className="w-full rounded-lg bg-indigo-100 px-3 py-2 text-left text-indigo-600 hover:bg-indigo-200"
              >
                <p className="text-lg font-semibold">{time}</p>
                <p className="truncate text-lg">{event.title}</p>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
