import { Button } from "../ui/Button";
import { EditIcon } from "../ui/icons/EditIcon";
import { TrashIcon } from "../ui/icons/TrashIcon";

type EventDetailsActionsProps = {
  state: {
    token: string | null;
    isOrganizer: boolean;
    isJoined: boolean;
    isFull: boolean;
    isBusy: boolean;
  };
  handlers: {
    onJoin: () => void;
    onLeave: () => void;
    onOpenDelete: () => void;
    onToggleEdit: () => void;
    onBack: () => void;
  };
};

export function EventDetailsActions({
  state,
  handlers,
}: EventDetailsActionsProps) {
  const { token, isOrganizer, isJoined, isFull, isBusy } = state;
  const { onJoin, onLeave, onOpenDelete, onToggleEdit, onBack } = handlers;

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {token ? (
        <>
          {/* Participants can join/leave unless they are the organizer. */}
          {!isOrganizer ? (
            isJoined ? (
              <Button
                type="button"
                disabled={isBusy}
                onClick={onLeave}
                className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-[1.05rem] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Leave
              </Button>
            ) : isFull ? (
              <span className="inline-block rounded-xl bg-slate-200 px-4 py-2.5 text-[1.05rem] font-semibold text-slate-700">
                Full
              </span>
            ) : (
              <Button
                type="button"
                disabled={isBusy}
                onClick={onJoin}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[1.05rem] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Join
              </Button>
            )
          ) : null}

          {isOrganizer ? (
            <>
              <Button
                type="button"
                disabled={isBusy}
                onClick={onToggleEdit}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-100 px-4 py-2.5 text-[1.05rem] font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
              >
                <EditIcon className="shrink-0" />
                Edit
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={onOpenDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2.5 text-[1.05rem] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
              >
                <TrashIcon className="shrink-0" />
                Delete
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={onBack}
                className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-[1.05rem] font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
              >
                ← Back
              </Button>
            </>
          ) : null}
        </>
      ) : null}

      {!isOrganizer ? (
        // Back action is always available for non-organizers.
        <Button
          type="button"
          disabled={isBusy}
          onClick={onBack}
          className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-[1.05rem] font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
        >
          ← Back
        </Button>
      ) : null}
    </div>
  );
}
