import { weekDays } from "./calendarUtils";

export function CalendarWeekHeader() {
  return (
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
  );
}
