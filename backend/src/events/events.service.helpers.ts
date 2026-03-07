import { ForbiddenException } from '@nestjs/common';
import { Participant } from '../participants/entities/participant.entity';
import { Event, EventVisibility } from './entities/event.entity';

export type AuthenticatedUser = {
  sub: string;
  email: string;
};

type EventFindOneRelations = {
  organizer: true;
  participants: true | { user: true };
};

export function buildFindOneRelations(
  user?: AuthenticatedUser,
): EventFindOneRelations {
  return user
    ? { organizer: true, participants: { user: true } }
    : { organizer: true, participants: true };
}

export function mergeAndSortCalendarEvents(
  organizedEvents: Event[],
  participantRows: Participant[],
): Event[] {
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

  if (!isOrganizer && !isParticipant) {
    throw new ForbiddenException(
      'You do not have access to this private event',
    );
  }
}

export function sanitizeParticipantEmails(event: Event): Event {
  const sanitizedParticipants = (event.participants ?? []).map(
    (participant) => {
      if (!participant.user) {
        return { ...participant };
      }

      const { email, ...userWithoutEmail } = participant.user;
      void email;

      return {
        ...participant,
        user: userWithoutEmail as Participant['user'],
      };
    },
  );

  return {
    ...event,
    participants: sanitizedParticipants as Participant[],
  };
}
