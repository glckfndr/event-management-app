import type { EventItem } from "../../types/event";
import { CalendarIcon } from "../ui/icons/CalendarIcon";
import { ClockIcon } from "../ui/icons/ClockIcon";
import { LocationPinIcon } from "../ui/icons/LocationPinIcon";
import { UsersGroupIcon } from "../ui/icons/UsersGroupIcon";
import { getTagAccentClassNames } from "../../shared/tagAccent";

type EventDetailsSummaryProps = {
  event: EventItem;
  participantsCount: number;
};

export function EventDetailsSummary({
  event,
  participantsCount,
}: EventDetailsSummaryProps) {
  const participantLabel = (
    participant: {
      userId: string;
      user?: { name?: string; email?: string };
    },
    index: number,
  ): string => {
    if (participant.user?.name?.trim()) {
      return participant.user.name;
    }

    return `participant ${index + 1}`;
  };

  return (
    <>
      <h2 className="text-[1.6rem] font-semibold text-slate-900">
        {event.title}
      </h2>
      <p className="mt-[0.675rem] text-lg text-slate-500">
        {event.description || "No description"}
      </p>

      {event.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span
              key={tag.id}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${getTagAccentClassNames(
                tag.name,
                "soft",
              )}`}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}

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
          {participantsCount} / {event.capacity == null ? "∞" : event.capacity}{" "}
          participants
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200" />

      <p className="mt-4 text-[1.05rem] text-slate-600">
        Organizer:{" "}
        {event.organizer?.name || event.organizer?.email || "Unknown"}
      </p>

      <div className="mt-5">
        <p className="text-[1.05rem] font-medium text-slate-700">
          Participants
        </p>

        {participantsCount === 0 ? (
          <p className="mt-2 text-[1.05rem] text-slate-600">
            No participants yet.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {event.participants?.map((participant, index) => (
              <span
                key={participant.id}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[1.05rem] font-medium text-slate-700"
              >
                {participantLabel(participant, index)}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
