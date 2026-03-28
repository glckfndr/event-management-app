import { Button } from "../ui/Button";

type ViewMode = "month" | "week";

type CalendarViewToggleProps = {
  viewMode: ViewMode;
  onChangeViewMode: (viewMode: ViewMode) => void;
};

export function CalendarViewToggle({
  viewMode,
  onChangeViewMode,
}: CalendarViewToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white p-1">
      <Button
        type="button"
        onClick={() => onChangeViewMode("month")}
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
        onClick={() => onChangeViewMode("week")}
        className={`rounded-md px-4 py-2 text-lg font-medium ${
          viewMode === "week"
            ? "bg-indigo-600 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        Week
      </Button>
    </div>
  );
}
