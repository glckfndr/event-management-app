import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Event as EventEntity,
  EventVisibility,
} from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { mergeAndSortCalendarEvents } from '../events/events.service.helpers';
import {
  answerFromIntent,
  answerFromRules,
  answerParticipantsFromQuestion,
  answerWhereIsFromQuestion,
} from './assistant-answer.helpers';
import {
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
  type AssistantContextSnapshot,
} from './assistant-llm.service';
import {
  isParticipantsQuestionText,
  isWhereIsQuestionText,
  shouldUseDateFallbackQuestion,
  shouldUseGlobalDateScopeQuestion,
} from './assistant-text.helpers';
import type {
  AssistantEvent,
  AssistantQuestionIntent,
} from './assistant.types';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

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
    const normalizedQuestion = question.trim();
    const events = await this.loadUserEvents(userId);
    const scopedEvents = await this.resolveEventsForQuestionScope(
      question,
      events,
    );
    const now = new Date();
    const shouldQueryLlm = Boolean(process.env.AI_API_KEY?.trim());

    this.trace(
      `Assistant request: llmEnabled=${shouldQueryLlm}, questionLength=${normalizedQuestion.length}`,
    );

    if (!shouldQueryLlm) {
      const localAnswer = answerFromRules(question, scopedEvents, now);

      if (localAnswer) {
        this.trace('Assistant response source: local-rules (no AI_API_KEY)');
        return { answer: localAnswer };
      }

      this.trace(
        'Assistant response source: fallback (no AI_API_KEY, no local match)',
      );
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    const snapshot = this.buildSnapshot(
      scopedEvents,
      now,
      userId,
      isParticipantsQuestionText(question),
    );

    const intent = await this.classifyQuestion(question, snapshot);

    if (!intent || intent.intent === 'fallback') {
      const lookupEvents = await this.resolveLookupEventsForQuestion(
        question,
        scopedEvents,
      );
      const fallbackResolution = this.resolveFallbackAnswer(
        question,
        lookupEvents,
        now,
      );

      if (fallbackResolution.answer) {
        this.trace(`Assistant response source: ${fallbackResolution.source}`);
        return { answer: fallbackResolution.answer };
      }

      this.trace('Assistant response source: fallback (llm unclear intent)');
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    if (
      intent.intent === 'where_is_event' ||
      intent.intent === 'show_participants'
    ) {
      const lookupEvents = await this.loadWhereIsLookupEvents(events);
      const lookupAnswer = answerFromIntent(
        intent,
        lookupEvents,
        now,
        userId,
        question,
      );

      if (!lookupAnswer) {
        const fallbackResolution = this.resolveFallbackAnswer(
          question,
          lookupEvents,
          now,
        );

        if (fallbackResolution.answer) {
          this.trace(`Assistant response source: ${fallbackResolution.source}`);
          return { answer: fallbackResolution.answer };
        }

        this.trace('Assistant response source: fallback (intent unsupported)');
        return { answer: ASSISTANT_FALLBACK_MESSAGE };
      }

      this.trace(`Assistant response source: llm-intent (${intent.intent})`);
      return { answer: lookupAnswer };
    }

    const answer = answerFromIntent(
      intent,
      scopedEvents,
      now,
      userId,
      question,
    );

    if (!answer) {
      const lookupEvents = await this.resolveLookupEventsForQuestion(
        question,
        scopedEvents,
      );
      const fallbackResolution = this.resolveFallbackAnswer(
        question,
        lookupEvents,
        now,
      );

      if (fallbackResolution.answer) {
        this.trace(`Assistant response source: ${fallbackResolution.source}`);
        return { answer: fallbackResolution.answer };
      }

      this.trace('Assistant response source: fallback (intent unsupported)');
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    this.trace(`Assistant response source: llm-intent (${intent.intent})`);
    return { answer };
  }

  private async resolveEventsForQuestionScope(
    question: string,
    userEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    if (!shouldUseGlobalDateScopeQuestion(question)) {
      return userEvents;
    }

    return this.loadWhereIsLookupEvents(userEvents);
  }

  private async classifyQuestion(
    question: string,
    snapshot: AssistantContextSnapshot,
  ): Promise<AssistantQuestionIntent | null> {
    return this.assistantLlmService.classifyQuestion(question, snapshot);
  }

  private trace(message: string): void {
    if (process.env.ASSISTANT_TRACE_LOGS?.trim().toLowerCase() !== 'true') {
      return;
    }

    this.logger.debug(message);
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

    const mergedEvents = mergeAndSortCalendarEvents(
      organizedEvents,
      participantRows,
    );

    this.trace(`DB response: loaded ${mergedEvents.length} events`);

    return this.toAssistantEvents(mergedEvents);
  }

  private toAssistantEvents(events: EventEntity[]): AssistantEvent[] {
    return events
      .map((event) => ({
        // TypeORM relation typing can be narrower than runtime-loaded relations.
        relationData: event as EventEntity & {
          tags?: Array<{ name: string }>;
          participants?: Array<{
            userId: string;
            user?: { name?: string | null; email?: string | null };
          }>;
        },
        id: event.id,
        title: event.title,
        eventDate: new Date(event.eventDate),
        visibility: event.visibility,
        location: event.location,
        organizerId: event.organizerId,
        tags: [],
        participantIds: [],
        participantLabels: [],
      }))
      .map(({ relationData, ...event }) => ({
        ...event,
        tags: (relationData.tags ?? []).map((tag) => tag.name),
        participantIds: (relationData.participants ?? []).map(
          (participant) => participant.userId,
        ),
        participantLabels: (relationData.participants ?? []).map(
          (participant) => {
            const name = participant.user?.name?.trim();

            if (name) {
              return name;
            }

            return participant.userId;
          },
        ),
      }));
  }

  private async loadWhereIsLookupEvents(
    userEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    const publicEvents = await this.eventsRepository.find({
      where: { visibility: EventVisibility.PUBLIC },
      relations: ['tags', 'participants', 'participants.user'],
    });

    const mappedPublicEvents = this.toAssistantEvents(publicEvents);
    const byId = new Map<string, AssistantEvent>();

    userEvents.forEach((event) => byId.set(event.id, event));
    mappedPublicEvents.forEach((event) => {
      if (!byId.has(event.id)) {
        byId.set(event.id, event);
      }
    });

    return [...byId.values()];
  }

  private async resolveLookupEventsForQuestion(
    question: string,
    userEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    const shouldUseGlobalLookup =
      isWhereIsQuestionText(question) || isParticipantsQuestionText(question);

    if (!shouldUseGlobalLookup) {
      return userEvents;
    }

    return this.loadWhereIsLookupEvents(userEvents);
  }

  private resolveFallbackAnswer(
    question: string,
    events: AssistantEvent[],
    now: Date,
  ): {
    source:
      | 'heuristic-participants'
      | 'heuristic-where-is'
      | 'heuristic-fallback'
      | 'local-rules-fallback';
    answer: string | null;
  } {
    const participantsAnswer = answerParticipantsFromQuestion(question, events);

    if (participantsAnswer) {
      return {
        source: 'heuristic-participants',
        answer: participantsAnswer,
      };
    }

    const locationAnswer = answerWhereIsFromQuestion(question, events);

    if (locationAnswer) {
      return {
        source: 'heuristic-where-is',
        answer: locationAnswer,
      };
    }

    if (shouldUseDateFallbackQuestion(question)) {
      const localFallbackAnswer = answerFromRules(question, events, now);

      if (localFallbackAnswer) {
        return {
          source: 'local-rules-fallback',
          answer: localFallbackAnswer,
        };
      }
    }

    return {
      source: 'heuristic-fallback',
      answer: null,
    };
  }

  private buildSnapshot(
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
}
