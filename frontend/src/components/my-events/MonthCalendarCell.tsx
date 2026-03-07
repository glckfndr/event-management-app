import type { EventItem } from "../../types/event";
import { Button } from "../ui/Button";
import { formatEventLabel, toLocalDateKey } from "./calendarUtils";

type MonthCalendarCellProps = {
  date: Date;
  events: EventItem[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
};

export function MonthCalendarCell({
  date,
  events,
  isCurrentMonth,
  isSelected,
  onSelect,
  onOpenEvent,
}: MonthCalendarCellProps) {
  const dateKey = toLocalDateKey(date);

  return (
    <div
      onClick={() => onSelect(dateKey)}
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
          <Button
            type="button"
            key={event.id}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onOpenEvent(event.id);
            }}
            className="w-full truncate rounded bg-indigo-100 px-2 py-1 text-left text-lg text-indigo-700 hover:bg-indigo-200"
            title={formatEventLabel(event.eventDate, event.title)}
          >
            {formatEventLabel(event.eventDate, event.title)}
          </Button>
        ))}

        {events.length > 2 ? (
          <p className="text-lg text-slate-500">+{events.length - 2} more</p>
        ) : null}
      </div>
    </div>
  );
}
