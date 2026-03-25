import { WeekCalendarCard } from "./WeekCalendarCard";
import { toLocalDateKey } from "./calendarUtils";
import type { EventItem } from "../../types/event";

type WeekCalendarGridProps = {
  weekCells: Date[];
  selectedDateKey: string | null;
  eventsByDate: Record<string, EventItem[]>;
  onSelectDate: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
};

export function WeekCalendarGrid({
  weekCells,
  selectedDateKey,
  eventsByDate,
  onSelectDate,
  onOpenEvent,
}: WeekCalendarGridProps) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-7">
      {weekCells.map((date) => {
        const dateKey = toLocalDateKey(date);

        return (
          <WeekCalendarCard
            key={`${dateKey}-week`}
            date={date}
            events={eventsByDate[dateKey] ?? []}
            isSelected={selectedDateKey === dateKey}
            onSelect={onSelectDate}
            onOpenEvent={onOpenEvent}
          />
        );
      })}
    </div>
  );
}
