import { SearchIcon } from "../ui/icons/SearchIcon";

type EventSearchBarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

export function EventSearchBar({
  searchTerm,
  onSearchTermChange,
}: EventSearchBarProps) {
  return (
    <div className="relative mt-8 max-w-xl">
      <span className="pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-slate-400">
        <SearchIcon />
      </span>
      <input
        value={searchTerm}
        onChange={(inputEvent) => onSearchTermChange(inputEvent.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
        placeholder="Search events..."
      />
    </div>
  );
}
