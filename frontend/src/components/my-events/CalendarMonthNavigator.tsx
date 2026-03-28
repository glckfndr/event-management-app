import { Button } from "../ui/Button";

type CalendarMonthNavigatorProps = {
  title: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function CalendarMonthNavigator({
  title,
  onPreviousMonth,
  onNextMonth,
}: CalendarMonthNavigatorProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={onPreviousMonth}
        className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
      >
        ‹
      </Button>
      <h3 className="text-4xl font-semibold">{title}</h3>
      <Button
        type="button"
        onClick={onNextMonth}
        className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-700 hover:bg-slate-50"
      >
        ›
      </Button>
    </div>
  );
}
