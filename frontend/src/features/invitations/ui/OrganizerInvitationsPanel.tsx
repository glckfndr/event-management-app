import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  createInvitation,
  fetchInvitationsForEvent,
  revokeInvitation,
} from "../model/invitationsSlice";
import { Button } from "../../../components/ui/Button";
import { FormErrorText } from "../../../components/ui/FormErrorText";
import type { InvitationItem } from "../../../types/invitation";

type OrganizerInvitationsPanelProps = {
  eventId: string;
  isPrivateEvent: boolean;
  isOrganizer: boolean;
};

const EMPTY_INVITATIONS: InvitationItem[] = [];

export function OrganizerInvitationsPanel({
  eventId,
  isPrivateEvent,
  isOrganizer,
}: OrganizerInvitationsPanelProps) {
  const dispatch = useAppDispatch();
  const invitations = useAppSelector(
    (state) => state.invitations.byEventId[eventId] ?? EMPTY_INVITATIONS,
  );
  const listStatus = useAppSelector(
    (state) => state.invitations.eventStatusById[eventId] ?? "idle",
  );
  const listError = useAppSelector(
    (state) => state.invitations.eventErrorById[eventId],
  );
  const actionError = useAppSelector((state) => state.invitations.actionError);
  const actionStatusByKey = useAppSelector(
    (state) => state.invitations.actionStatusByKey,
  );
  const isCreating = useAppSelector(
    (state) =>
      state.invitations.actionStatusByKey[`create:${eventId}`] === "loading",
  );
  const [invitedUserId, setInvitedUserId] = useState("");

  useEffect(() => {
    if (isOrganizer && isPrivateEvent) {
      void dispatch(fetchInvitationsForEvent(eventId));
    }
  }, [dispatch, eventId, isOrganizer, isPrivateEvent]);

  const handleInvite = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    const nextUserId = invitedUserId.trim();
    if (!nextUserId) {
      return;
    }

    try {
      await dispatch(
        createInvitation({
          eventId,
          invitedUserId: nextUserId,
        }),
      ).unwrap();
      setInvitedUserId("");
    } catch {
      // Error state is handled by Redux slice for consistent UX.
    }
  };

  if (!isOrganizer || !isPrivateEvent) {
    return null;
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-lg font-semibold text-slate-900">Invitations</h3>
      <p className="mt-1 text-sm text-slate-600">
        Invite users by their account UUID to join this private event.
      </p>

      <form
        onSubmit={(event) => void handleInvite(event)}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={invitedUserId}
          onChange={(event) => setInvitedUserId(event.target.value)}
          type="text"
          placeholder="Invited user UUID"
          className="min-w-70 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <Button
          type="submit"
          disabled={isCreating || invitedUserId.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isCreating ? "Inviting..." : "Invite"}
        </Button>
      </form>

      {listStatus === "loading" ? (
        <p className="mt-4 text-sm text-slate-600">Loading invitations...</p>
      ) : null}

      {listError ? (
        <FormErrorText className="mt-3">{listError}</FormErrorText>
      ) : null}
      {actionError ? (
        <FormErrorText className="mt-2">{actionError}</FormErrorText>
      ) : null}

      {invitations.length === 0 && listStatus !== "loading" ? (
        <p className="mt-4 text-sm text-slate-600">No invitations yet.</p>
      ) : null}

      {invitations.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {invitations.map((invitation) => {
            const isRevoking =
              actionStatusByKey[`revoke:${invitation.id}`] === "loading";

            return (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-sm text-slate-800">
                  <span className="font-medium">
                    {invitation.invitedUser?.email ?? invitation.invitedUserId}
                  </span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-600">
                    {invitation.status}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={isRevoking}
                  onClick={() => {
                    void dispatch(
                      revokeInvitation({
                        eventId,
                        invitationId: invitation.id,
                      }),
                    );
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {isRevoking ? "Revoking..." : "Revoke"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
