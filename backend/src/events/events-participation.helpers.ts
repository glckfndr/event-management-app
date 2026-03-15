import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Event } from './entities/event.entity';

export const assertEventFound = (event: Event | null): Event => {
  if (!event) {
    throw new NotFoundException('Event not found');
  }

  return event;
};

export const assertUserCanJoinEvent = (event: Event, userId: string): void => {
  if (event.organizerId === userId) {
    throw new ForbiddenException(
      'Organizer cannot join their own event as participant',
    );
  }
};

export const assertNotJoinedYet = (alreadyJoined: boolean): void => {
  if (alreadyJoined) {
    throw new ConflictException('User already joined this event');
  }
};

export const assertCapacityAvailable = (
  event: Event,
  participantCount: number,
): void => {
  if (event.capacity !== null && event.capacity !== undefined) {
    if (participantCount >= event.capacity) {
      throw new ConflictException('Event capacity reached');
    }
  }
};
