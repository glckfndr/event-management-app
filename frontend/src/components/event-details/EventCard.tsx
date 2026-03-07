import { Button } from "../ui/Button";
import type { KeyboardEvent } from "react";
import { CalendarIcon } from "../ui/icons/CalendarIcon";
import { ClockIcon } from "../ui/icons/ClockIcon";
import { LocationPinIcon } from "../ui/icons/LocationPinIcon";
import { UsersGroupIcon } from "../ui/icons/UsersGroupIcon";
import type { EventItem } from "../../types/event";

type EventCardProps = {
  event: EventItem;
  state: {
    token: string | null;
    isOrganizer: boolean;
    isJoined: boolean;
    isBusy: boolean;
  };
  handlers: {
    onOpen: () => void;
    onJoin: () => void;
    onLeave: () => void;
    onRequireLogin: () => void;
  };
};

const shortDescription = (description?: string) => {
  if (!description) {
    return "No description";
  }

  if (description.length <= 120) {
    return description;
  }

  return `${description.slice(0, 117)}...`;
};

export function EventCard({ event, state, handlers }: EventCardProps) {
  const { token, isOrganizer, isJoined, isBusy } = state;
  const { onOpen, onJoin, onLeave, onRequireLogin } = handlers;

  const handleCardKeyDown = (eventKeyDown: KeyboardEvent<HTMLElement>) => {
    if (eventKeyDown.target !== eventKeyDown.currentTarget) {
      return;
    }

    if (eventKeyDown.key === "Enter" || eventKeyDown.key === " ") {
      eventKeyDown.preventDefault();
      onOpen();
    }
  };

  const isFull =
    event.capacity != null &&
    (event.participants?.length ?? 0) >= event.capacity;

  return (
    <article
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6"
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open event details for ${event.title}`}
    >
      {isOrganizer ? (
        <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold lowercase text-indigo-700">
          organizer
        </span>
      ) : null}

      <h3 className="text-[1.6rem] font-semibold text-slate-900 hover:text-indigo-600">
        {event.title}
      </h3>
      <p className="mt-[0.675rem] text-lg text-slate-500">
        {shortDescription(event.description)}
      </p>

      <div className="mt-5 space-y-2 text-lg text-slate-500">
        <p className="flex items-center gap-2">
          <CalendarIcon className="text-slate-500" />
          {new Date(event.eventDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="flex items-center gap-2">
          <ClockIcon className="text-slate-500" />
          {new Date(event.eventDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="flex items-center gap-2">
          <LocationPinIcon className="text-slate-500" />
          {event.location || "Location TBD"}
        </p>
        <p className="flex items-center gap-2">
          <UsersGroupIcon className="text-slate-500" />
          {event.participants?.length ?? 0} /{" "}
          {event.capacity == null ? "∞" : event.capacity} participants
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200" />

      {!isOrganizer ? (
        <p className="mt-4 text-[1.05rem] text-slate-600">
          organizer:{" "}
          {event.organizer?.name || event.organizer?.email || "Unknown"}
        </p>
      ) : null}

      <div
        className="mt-4"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        {isOrganizer ? null : token && isJoined ? (
          <Button
            type="button"
            disabled={isBusy}
            onClick={onLeave}
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-[1.05rem] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
          >
            Leave Event
          </Button>
        ) : isFull ? (
          <span className="inline-block w-full rounded-xl bg-slate-200 px-4 py-2 text-center text-[1.05rem] font-semibold text-slate-600">
            Full
          </span>
        ) : token ? (
          <Button
            type="button"
            disabled={isBusy}
            onClick={onJoin}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-[1.05rem] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Join Event
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onRequireLogin}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-[1.05rem] font-semibold text-white hover:bg-emerald-500"
          >
            Join Event
          </Button>
        )}
      </div>
    </article>
  );
}
