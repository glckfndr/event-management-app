import { ForbiddenException } from '@nestjs/common';
import { Participant } from '../participants/entities/participant.entity';
import { Event, EventVisibility } from './entities/event.entity';
import { EventInvitationStatus } from '../invitations/entities/event-invitation.entity';

export type AuthenticatedUser = {
  sub: string;
  email: string;
};

export function mergeAndSortCalendarEvents(
  organizedEvents: Event[],
  participantRows: Participant[],
): Event[] {
  // Include events where the user participates and remove duplicates by id.
  const joinedEvents = participantRows
    .map((participant) => participant.event)
    .filter((event): event is Event => Boolean(event));

  const eventsById = new Map<string, Event>();

  for (const event of [...organizedEvents, ...joinedEvents]) {
    eventsById.set(event.id, event);
  }

  return [...eventsById.values()].sort(
    (first, second) =>
      new Date(first.eventDate).getTime() -
      new Date(second.eventDate).getTime(),
  );
}

export function assertPrivateEventAccess(
  event: Event,
  user?: AuthenticatedUser,
): void {
  // Public events are always readable.
  if (event.visibility !== EventVisibility.PRIVATE) {
    return;
  }

  if (!user) {
    throw new ForbiddenException(
      'Authentication is required to access private events',
    );
  }

  const isOrganizer = event.organizerId === user.sub;
  const isParticipant = event.participants.some(
    (participant) => participant.userId === user.sub,
  );
  const hasAcceptedInvitation = (event.invitations ?? []).some(
    (invitation) =>
      invitation.invitedUserId === user.sub &&
      invitation.status === EventInvitationStatus.ACCEPTED,
  );

  if (!isOrganizer && !isParticipant && !hasAcceptedInvitation) {
    throw new ForbiddenException(
      'You do not have access to this private event',
    );
  }
}

export function sanitizeParticipantEmails(event: Event): Event {
  // Remove participant email from API responses while preserving other user fields.
  const sanitizedParticipants = (event.participants ?? []).map(
    (participant) => {
      if (!participant.user) {
        return { ...participant };
      }

      const { email: _email, ...userWithoutEmail } = participant.user;

      return {
        ...participant,
        user: userWithoutEmail as Participant['user'],
      };
    },
  );

  const { invitations: _invitations, ...eventWithoutInvitations } = event;

  return {
    ...eventWithoutInvitations,
    participants: sanitizedParticipants as Participant[],
  } as Event;
}
