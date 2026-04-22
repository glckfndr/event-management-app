import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  acceptInvitation,
  declineInvitation,
  fetchMyInvitations,
} from "../features/invitations/model/invitationsSlice";
import { Button } from "../components/ui/Button";
import { FormErrorText } from "../components/ui/FormErrorText";

export function MyInvitationsPage() {
  const dispatch = useAppDispatch();
  const invitations = useAppSelector(
    (state) => state.invitations.myInvitations,
  );
  const status = useAppSelector((state) => state.invitations.myStatus);
  const error = useAppSelector((state) => state.invitations.myError);
  const actionError = useAppSelector((state) => state.invitations.actionError);
  const actionStatusByKey = useAppSelector(
    (state) => state.invitations.actionStatusByKey,
  );

  useEffect(() => {
    void dispatch(fetchMyInvitations());
  }, [dispatch]);

  return (
    <section>
      <h2 className="text-4xl font-bold text-slate-900">My Invitations</h2>
      <p className="mt-2 text-lg text-slate-600">
        Review your pending invites and decide whether to join private events.
      </p>

      {status === "loading" ? (
        <p className="mt-6 text-slate-700">Loading invitations...</p>
      ) : null}
      {error ? <FormErrorText className="mt-6">{error}</FormErrorText> : null}
      {actionError ? (
        <FormErrorText className="mt-4">{actionError}</FormErrorText>
      ) : null}

      {status === "idle" && !error && invitations.length === 0 ? (
        <p className="mt-6 text-slate-600">No invitations yet.</p>
      ) : null}

      {invitations.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {invitations.map((invitation) => {
            const isBusy =
              actionStatusByKey[`respond:${invitation.id}`] === "loading";

            const eventTitle = invitation.event?.title ?? "Private event";
            const eventDate = invitation.event?.eventDate
              ? new Date(invitation.event.eventDate).toLocaleString()
              : "Date hidden until accepted";
            const eventLocation =
              invitation.event?.location ?? "Location hidden until accepted";

            return (
              <li
                key={invitation.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {eventTitle}
                    </h3>
                    <p className="text-sm text-slate-600">{eventDate}</p>
                    <p className="text-sm text-slate-600">{eventLocation}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                    {invitation.status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Invited by:{" "}
                  {invitation.invitedByUser?.email ??
                    invitation.invitedByUserId}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {invitation.status === "pending" ? (
                    <>
                      <Button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void dispatch(acceptInvitation(invitation.id));
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {isBusy ? "Processing..." : "Accept"}
                      </Button>
                      <Button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void dispatch(declineInvitation(invitation.id));
                        }}
                        className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                      >
                        {isBusy ? "Processing..." : "Decline"}
                      </Button>
                    </>
                  ) : null}

                  {invitation.status === "accepted" && invitation.eventId ? (
                    <Link
                      to={`/events/${invitation.eventId}`}
                      className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Open event
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
