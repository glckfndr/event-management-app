import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event as EventEntity } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import {
  AssistantContextSnapshot,
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';

type AssistantEvent = {
  id: string;
  title: string;
  eventDate: Date;
  visibility: 'public' | 'private';
  organizerId: string;
  tags: string[];
  participantIds: string[];
};

@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    private readonly assistantLlmService: AssistantLlmService,
  ) {}

  async answerQuestion(
    question: string,
    userId: string,
  ): Promise<{ answer: string }> {
    const events = await this.loadUserEvents(userId);
    const now = new Date();
    const localAnswer = this.answerFromRules(question, events, now);

    if (!localAnswer) {
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    const snapshot = this.buildSnapshot(events, now);

    const llmAnswer = await this.assistantLlmService.askQuestion(
      question,
      snapshot,
    );

    const normalizedLlmAnswer = llmAnswer?.trim();

    if (
      normalizedLlmAnswer &&
      normalizedLlmAnswer !== ASSISTANT_FALLBACK_MESSAGE
    ) {
      return { answer: normalizedLlmAnswer };
    }

    return {
      answer: localAnswer,
    };
  }

  private async loadUserEvents(userId: string): Promise<AssistantEvent[]> {
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

    const eventsById = new Map<string, EventEntity>();

    for (const event of organizedEvents) {
      eventsById.set(event.id, event);
    }

    for (const participantRow of participantRows) {
      if (participantRow.event) {
        eventsById.set(participantRow.event.id, participantRow.event);
      }
    }

    return [...eventsById.values()]
      .map((event) => ({
        // TypeORM relation typing can be narrower than runtime-loaded relations.
        relationData: event as EventEntity & {
          tags?: Array<{ name: string }>;
          participants?: Array<{ userId: string }>;
        },
        id: event.id,
        title: event.title,
        eventDate: new Date(event.eventDate),
        visibility: event.visibility,
        organizerId: event.organizerId,
        tags: [],
        participantIds: [],
      }))
      .map(({ relationData, ...event }) => ({
        ...event,
        tags: (relationData.tags ?? []).map((tag) => tag.name),
        participantIds: (relationData.participants ?? []).map(
          (participant) => participant.userId,
        ),
      }))
      .sort(
        (first, second) =>
          first.eventDate.getTime() - second.eventDate.getTime(),
      );
  }

  private buildSnapshot(
    events: AssistantEvent[],
    now: Date,
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
      generatedAt: now.toISOString(),
      dateWindow: {
        earliestEventDate: sortedDates[0]?.toISOString() ?? null,
        latestEventDate: sortedDates.at(-1)?.toISOString() ?? null,
      },
      eventCount: events.length,
      tags,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        visibility: event.visibility,
        tags: event.tags,
        participantCount: event.participantIds.length,
        participantIds: event.participantIds,
      })),
    };
  }

  private answerFromRules(
    question: string,
    events: AssistantEvent[],
    now: Date,
  ): string | null {
    const normalizedQuestion = question.trim().toLowerCase();

    if (!normalizedQuestion) {
      return null;
    }

    if (
      /(how many|count|total)/.test(normalizedQuestion) &&
      /events?/.test(normalizedQuestion)
    ) {
      return `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`;
    }

    if (
      /participants?|attendees?|who joined|who is joining/.test(
        normalizedQuestion,
      )
    ) {
      return this.answerParticipantsQuestion(normalizedQuestion, events);
    }

    const dates = this.extractIsoDates(normalizedQuestion);
    const hasDateRangeIntent =
      /(from|between).*(to|and)|date range/.test(normalizedQuestion) &&
      dates.length >= 2;

    if (hasDateRangeIntent) {
      return this.answerDateRangeQuestion(dates[0], dates[1], events);
    }

    if (dates.length === 1 && /(on|for|date|day)/.test(normalizedQuestion)) {
      return this.answerSingleDayQuestion(dates[0], events);
    }

    if (/previous week|past week|last week/.test(normalizedQuestion)) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const matchingEvents = events.filter(
        (event) => event.eventDate >= start && event.eventDate < now,
      );

      return this.formatEventList(
        matchingEvents,
        'Events from the previous week',
      );
    }

    if (/past events?/.test(normalizedQuestion)) {
      const matchingEvents = events.filter((event) => event.eventDate < now);
      return this.formatEventList(matchingEvents, 'Past events');
    }

    if (/upcoming|next|future/.test(normalizedQuestion)) {
      const matchingEvents = events.filter((event) => event.eventDate >= now);
      return this.formatEventList(matchingEvents, 'Upcoming events');
    }

    if (/tag/.test(normalizedQuestion)) {
      const tags = [
        ...new Set(
          events.flatMap((event) => event.tags.map((tag) => tag.toLowerCase())),
        ),
      ];
      const matchedTags = tags.filter((tag) =>
        normalizedQuestion.includes(tag),
      );

      if (matchedTags.length === 0) {
        return 'I could not find the requested tag in your events.';
      }

      const matchingEvents = events.filter((event) =>
        event.tags.some((tag) => matchedTags.includes(tag.toLowerCase())),
      );

      return this.formatEventList(
        matchingEvents,
        `Events with tag ${matchedTags.join(', ')}`,
      );
    }

    return null;
  }

  private answerParticipantsQuestion(
    normalizedQuestion: string,
    events: AssistantEvent[],
  ): string {
    const quotedTitleMatch = normalizedQuestion.match(/"([^"]+)"/);
    const requestedTitle = quotedTitleMatch?.[1]?.trim();

    const matchedEvent = requestedTitle
      ? events.find((event) =>
          event.title.toLowerCase().includes(requestedTitle),
        )
      : events.find((event) =>
          normalizedQuestion.includes(event.title.toLowerCase()),
        );

    if (!matchedEvent) {
      return ASSISTANT_FALLBACK_MESSAGE;
    }

    if (matchedEvent.participantIds.length === 0) {
      return `"${matchedEvent.title}" has no participants yet.`;
    }

    const list = matchedEvent.participantIds.slice(0, 10).join(', ');
    return `Participants for "${matchedEvent.title}": ${list}.`;
  }

  private answerDateRangeQuestion(
    startDateIso: string,
    endDateIso: string,
    events: AssistantEvent[],
  ): string {
    const startDate = new Date(`${startDateIso}T00:00:00.000Z`);
    const endDate = new Date(`${endDateIso}T23:59:59.999Z`);

    const matchingEvents = events.filter(
      (event) => event.eventDate >= startDate && event.eventDate <= endDate,
    );

    return this.formatEventList(
      matchingEvents,
      `Events from ${startDateIso} to ${endDateIso}`,
    );
  }

  private answerSingleDayQuestion(
    dateIso: string,
    events: AssistantEvent[],
  ): string {
    const start = new Date(`${dateIso}T00:00:00.000Z`);
    const end = new Date(`${dateIso}T23:59:59.999Z`);

    const matchingEvents = events.filter(
      (event) => event.eventDate >= start && event.eventDate <= end,
    );

    return this.formatEventList(matchingEvents, `Events on ${dateIso}`);
  }

  private formatEventList(events: AssistantEvent[], title: string): string {
    if (events.length === 0) {
      return `${title}: none.`;
    }

    const conciseList = events
      .slice(0, 8)
      .map(
        (event) =>
          `${event.title} (${event.eventDate.toISOString().slice(0, 16).replace('T', ' ')})`,
      )
      .join('; ');

    return `${title}: ${conciseList}.`;
  }

  private extractIsoDates(value: string): string[] {
    const matches = value.match(/\b\d{4}-\d{2}-\d{2}\b/g);
    return matches ? [...new Set(matches)] : [];
  }
}
