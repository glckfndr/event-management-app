import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Event as EventEntity,
  EventVisibility,
} from '../events/entities/event.entity';
import { mergeAndSortCalendarEvents } from '../events/events.service.helpers';
import { Participant } from '../participants/entities/participant.entity';
import type { AssistantContextSnapshot } from './assistant-llm.service';
import type { AssistantEvent } from './assistant.types';

@Injectable()
export class AssistantDataService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
  ) {}

  async loadUserEvents(userId: string): Promise<AssistantEvent[]> {
    // Read organizer and participant views in parallel, then merge unique events.
    const [organizedEvents, participantRows] = await Promise.all([
      this.eventsRepository.find({
        where: { organizerId: userId },
        relations: ['tags', 'participants', 'participants.user'],
      }),
      this.participantsRepository.find({
        where: { userId },
        relations: [
          'event',
          'event.tags',
          'event.participants',
          'event.participants.user',
        ],
      }),
    ]);

    const mergedEvents = mergeAndSortCalendarEvents(
      organizedEvents,
      participantRows,
    );

    return this.toAssistantEvents(mergedEvents);
  }

  async loadPublicLookupEvents(
    seedEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    const publicEvents = await this.eventsRepository.find({
      where: { visibility: EventVisibility.PUBLIC },
      relations: ['tags', 'participants', 'participants.user'],
    });

    const mappedPublicEvents = this.toAssistantEvents(publicEvents);
    const byId = new Map<string, AssistantEvent>();

    seedEvents.forEach((event) => byId.set(event.id, event));
    mappedPublicEvents.forEach((event) => {
      if (!byId.has(event.id)) {
        byId.set(event.id, event);
      }
    });

    return [...byId.values()];
  }

  buildSnapshot(
    events: AssistantEvent[],
    now: Date,
    userId: string,
    includeParticipantIdentifiers: boolean,
  ): AssistantContextSnapshot {
    const sortedDates = events
      .map((event) => event.eventDate)
      .sort((first, second) => first.getTime() - second.getTime());

    const tags = [
      ...new Set(
        events.flatMap((event) => event.tags).map((tag) => tag.toLowerCase()),
      ),
    ].sort();

    return {
      currentUserId: userId,
      generatedAt: now.toISOString(),
      dateWindow: {
        earliestEventDate: sortedDates[0]?.toISOString() ?? null,
        latestEventDate: sortedDates.at(-1)?.toISOString() ?? null,
      },
      eventCount: events.length,
      tags,
      events: events.map((event) => {
        const eventSnapshot = {
          title: event.title,
          eventDate: event.eventDate.toISOString(),
          visibility: event.visibility,
          relationToUser:
            event.organizerId === userId
              ? ('organizer' as const)
              : event.participantIds.includes(userId)
                ? ('participant' as const)
                : ('unrelated' as const),
          location: event.location,
          tags: event.tags,
          participantCount: event.participantIds.length,
        };

        if (includeParticipantIdentifiers) {
          return {
            ...eventSnapshot,
            participantIds: event.participantIds,
          };
        }

        return eventSnapshot;
      }),
    };
  }

  private toAssistantEvents(events: EventEntity[]): AssistantEvent[] {
    return events.map((event) => {
      // TypeORM relation typing can be narrower than runtime-loaded relations.
      const typedEvent = event as EventEntity & {
        tags?: Array<{ name: string }>;
        participants?: Array<{
          userId: string;
          user?: { name?: string | null; email?: string | null };
        }>;
      };

      return {
        id: event.id,
        title: event.title,
        eventDate: new Date(event.eventDate),
        visibility: event.visibility,
        location: event.location,
        organizerId: event.organizerId,
        tags: (typedEvent.tags ?? []).map((tag) => tag.name),
        participantIds: (typedEvent.participants ?? []).map(
          (row) => row.userId,
        ),
        participantLabels: (typedEvent.participants ?? []).map((row) => {
          const name = row.user?.name?.trim();

          if (name) {
            return name;
          }

          return row.userId;
        }),
      };
    });
  }
}
