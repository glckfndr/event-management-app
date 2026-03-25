import { MonthCalendarCell } from "./MonthCalendarCell";
import { toLocalDateKey } from "./calendarUtils";
import type { EventItem } from "../../types/event";

type MonthCalendarGridProps = {
  monthCells: Date[];
  currentMonth: Date;
  selectedDateKey: string | null;
  eventsByDate: Record<string, EventItem[]>;
  onSelectDate: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
};

export function MonthCalendarGrid({
  monthCells,
  currentMonth,
  selectedDateKey,
  eventsByDate,
  onSelectDate,
  onOpenEvent,
}: MonthCalendarGridProps) {
  return (
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
            onSelect={onSelectDate}
            onOpenEvent={onOpenEvent}
          />
        );
      })}
    </div>
  );
}
