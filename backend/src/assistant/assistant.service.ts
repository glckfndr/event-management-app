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
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';
import type { AssistantContextSnapshot } from './assistant-llm.service';

type AssistantEvent = {
  id: string;
  title: string;
  eventDate: Date;
  visibility: 'public' | 'private';
  organizerId: string;
  location?: string | null;
  tags: string[];
  participantIds: string[];
  participantLabels: string[];
};

type AssistantQuestionIntent = {
  intent:
    | 'count_total'
    | 'list_upcoming'
    | 'list_on_date'
    | 'list_in_range'
    | 'list_previous_week'
    | 'list_by_tag'
    | 'show_participants'
    | 'next_event'
    | 'where_is_event'
    | 'list_organized'
    | 'list_attending_this_week'
    | 'fallback';
  date?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
  eventTitle?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};

type AssistantQuestionConstraints = {
  tag?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};

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
    const events = await this.loadUserEvents(userId);
    const scopedEvents = await this.resolveEventsForQuestionScope(
      question,
      events,
    );
    const now = new Date();
    const shouldQueryLlm = Boolean(process.env.AI_API_KEY?.trim());

    this.trace(
      `Assistant request: llmEnabled=${shouldQueryLlm}, question="${question.trim()}"`,
    );

    if (!shouldQueryLlm) {
      const localAnswer = this.answerFromRules(question, scopedEvents, now);

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
      this.isParticipantsQuestion(question),
    );

    const intent = await this.classifyQuestion(question, snapshot);

    if (!intent || intent.intent === 'fallback') {
      const participantsQuestion = this.isParticipantsQuestion(question);
      const whereIsQuestion = this.isWhereIsQuestion(question);
      const lookupEvents =
        participantsQuestion || whereIsQuestion
          ? await this.loadWhereIsLookupEvents(scopedEvents)
          : scopedEvents;

      const recoveredParticipantsAnswer = this.answerParticipantsFromQuestion(
        question,
        lookupEvents,
      );

      if (recoveredParticipantsAnswer) {
        this.trace('Assistant response source: heuristic-participants');
        return { answer: recoveredParticipantsAnswer };
      }

      const recoveredLocationAnswer = this.answerWhereIsFromQuestion(
        question,
        lookupEvents,
      );

      if (recoveredLocationAnswer) {
        this.trace('Assistant response source: heuristic-where-is');
        return { answer: recoveredLocationAnswer };
      }

      if (this.shouldUseDateFallback(question)) {
        const localFallbackAnswer = this.answerFromRules(
          question,
          lookupEvents,
          now,
        );

        if (localFallbackAnswer) {
          this.trace('Assistant response source: local-rules-fallback');
          return { answer: localFallbackAnswer };
        }
      }

      this.trace('Assistant response source: fallback (llm unclear intent)');
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    if (
      intent.intent === 'where_is_event' ||
      intent.intent === 'show_participants'
    ) {
      const lookupEvents = await this.loadWhereIsLookupEvents(events);
      const lookupAnswer = this.answerFromIntent(
        intent,
        lookupEvents,
        now,
        userId,
        question,
      );

      if (!lookupAnswer) {
        const heuristicAnswer = this.answerFromQuestionHeuristics(
          question,
          lookupEvents,
        );

        if (heuristicAnswer) {
          this.trace('Assistant response source: heuristic-fallback');
          return { answer: heuristicAnswer };
        }

        if (this.shouldUseDateFallback(question)) {
          const localFallbackAnswer = this.answerFromRules(
            question,
            lookupEvents,
            now,
          );

          if (localFallbackAnswer) {
            this.trace('Assistant response source: local-rules-fallback');
            return { answer: localFallbackAnswer };
          }
        }

        this.trace('Assistant response source: fallback (intent unsupported)');
        return { answer: ASSISTANT_FALLBACK_MESSAGE };
      }

      this.trace(`Assistant response source: llm-intent (${intent.intent})`);
      return { answer: lookupAnswer };
    }

    const answer = this.answerFromIntent(
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
      const heuristicAnswer = this.answerFromQuestionHeuristics(
        question,
        lookupEvents,
      );

      if (heuristicAnswer) {
        this.trace('Assistant response source: heuristic-fallback');
        return { answer: heuristicAnswer };
      }

      if (this.shouldUseDateFallback(question)) {
        const localFallbackAnswer = this.answerFromRules(
          question,
          lookupEvents,
          now,
        );

        if (localFallbackAnswer) {
          this.trace('Assistant response source: local-rules-fallback');
          return { answer: localFallbackAnswer };
        }
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
    if (!this.shouldUseGlobalDateScope(question)) {
      return userEvents;
    }

    return this.loadWhereIsLookupEvents(userEvents);
  }

  private async classifyQuestion(
    question: string,
    snapshot: AssistantContextSnapshot,
  ): Promise<AssistantQuestionIntent | null> {
    const classifier = this.assistantLlmService as {
      classifyQuestion: (
        value: string,
        context: AssistantContextSnapshot,
      ) => Promise<AssistantQuestionIntent | null>;
    };

    return classifier.classifyQuestion(question, snapshot);
  }

  private trace(message: string): void {
    this.logger.log(message);
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

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[AssistantService] DB response: loaded ${mergedEvents.length} events for user ${userId}`,
      );
    }

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

            const email = participant.user?.email?.trim();

            if (email) {
              return email;
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
      this.isWhereIsQuestion(question) || this.isParticipantsQuestion(question);

    if (!shouldUseGlobalLookup) {
      return userEvents;
    }

    return this.loadWhereIsLookupEvents(userEvents);
  }

  private answerFromQuestionHeuristics(
    question: string,
    events: AssistantEvent[],
  ): string | null {
    const participantsAnswer = this.answerParticipantsFromQuestion(
      question,
      events,
    );

    if (participantsAnswer) {
      return participantsAnswer;
    }

    return this.answerWhereIsFromQuestion(question, events);
  }

  private shouldUseDateFallback(question: string): boolean {
    const normalizedQuestion = question.trim().toLowerCase();
    const dates = this.extractIsoDates(normalizedQuestion);

    const hasDateRangeIntent =
      /(from|between).*(to|and)|date range/.test(normalizedQuestion) &&
      dates.length >= 2;
    const hasSingleDayIntent =
      dates.length === 1 && /(on|for|date|day)/.test(normalizedQuestion);

    return hasDateRangeIntent || hasSingleDayIntent;
  }

  private shouldUseGlobalDateScope(question: string): boolean {
    if (!this.shouldUseDateFallback(question)) {
      return false;
    }

    const normalizedQuestion = question.trim().toLowerCase();
    const hasExplicitMyScope =
      /\b(my|i|me|mine|myself)\b/.test(normalizedQuestion) ||
      /\b(мо[їєя]|моїх|моєю|мене|мені|я)\b/.test(normalizedQuestion);

    return !hasExplicitMyScope;
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

  private isParticipantsQuestion(question: string): boolean {
    const normalizedQuestion = question.trim().toLowerCase();
    return /participants?|attendees?|who joined|who is joining|who.?s attending|who are attending/.test(
      normalizedQuestion,
    );
  }

  private answerFromRules(
    question: string,
    events: AssistantEvent[],
    now: Date,
  ): string | null {
    const normalizedQuestion = question.trim().toLowerCase();
    const isCountQuestion =
      /(how many|count|total)/.test(normalizedQuestion) &&
      /events?/.test(normalizedQuestion);

    if (!normalizedQuestion) {
      return null;
    }

    if (this.isParticipantsQuestion(normalizedQuestion)) {
      return this.answerParticipantsQuestion(normalizedQuestion, events);
    }

    const dates = this.extractIsoDates(normalizedQuestion);
    const hasDateRangeIntent =
      /(from|between).*(to|and)|date range/.test(normalizedQuestion) &&
      dates.length >= 2;

    if (hasDateRangeIntent) {
      if (isCountQuestion) {
        const startDate = new Date(`${dates[0]}T00:00:00.000Z`);
        const endDate = new Date(`${dates[1]}T23:59:59.999Z`);
        const matchingEvents = events.filter(
          (event) => event.eventDate >= startDate && event.eventDate <= endDate,
        );

        return this.formatFilteredCount(
          `Events from ${dates[0]} to ${dates[1]}`,
          matchingEvents.length,
        );
      }

      return this.answerDateRangeQuestion(dates[0], dates[1], events);
    }

    if (dates.length === 1 && /(on|for|date|day)/.test(normalizedQuestion)) {
      if (isCountQuestion) {
        const start = new Date(`${dates[0]}T00:00:00.000Z`);
        const end = new Date(`${dates[0]}T23:59:59.999Z`);
        const matchingEvents = events.filter(
          (event) => event.eventDate >= start && event.eventDate <= end,
        );

        return this.formatFilteredCount(
          `Events on ${dates[0]}`,
          matchingEvents.length,
        );
      }

      return this.answerSingleDayQuestion(dates[0], events);
    }

    if (/previous week|past week|last week/.test(normalizedQuestion)) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const matchingEvents = events.filter(
        (event) => event.eventDate >= start && event.eventDate < now,
      );

      if (isCountQuestion) {
        return this.formatFilteredCount(
          'Events from the previous week',
          matchingEvents.length,
        );
      }

      return this.formatEventList(
        matchingEvents,
        'Events from the previous week',
      );
    }

    if (/past events?/.test(normalizedQuestion)) {
      const matchingEvents = events.filter((event) => event.eventDate < now);

      if (isCountQuestion) {
        return this.formatFilteredCount('Past events', matchingEvents.length);
      }

      return this.formatEventList(matchingEvents, 'Past events');
    }

    if (/upcoming|next|future/.test(normalizedQuestion)) {
      const matchingEvents = events.filter((event) => event.eventDate >= now);

      if (isCountQuestion) {
        return this.formatFilteredCount(
          'Upcoming events',
          matchingEvents.length,
        );
      }

      return this.formatEventList(matchingEvents, 'Upcoming events');
    }

    const tags = [
      ...new Set(
        events.flatMap((event) => event.tags.map((tag) => tag.toLowerCase())),
      ),
    ];
    const matchedTags = tags.filter((tag) => normalizedQuestion.includes(tag));
    const isTagFilterQuestion =
      this.hasTagIntent(normalizedQuestion) ||
      (this.hasEventsIntent(normalizedQuestion) && matchedTags.length > 0);

    if (isTagFilterQuestion) {
      if (matchedTags.length === 0) {
        return 'I could not find the requested tag in your events.';
      }

      const matchingEvents = events.filter((event) =>
        event.tags.some((tag) => matchedTags.includes(tag.toLowerCase())),
      );

      if (isCountQuestion) {
        return this.formatFilteredCount(
          `Events with tag ${matchedTags.join(', ')}`,
          matchingEvents.length,
        );
      }

      return this.formatEventList(
        matchingEvents,
        `Events with tag ${matchedTags.join(', ')}`,
      );
    }

    if (isCountQuestion) {
      return `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`;
    }

    return null;
  }

  private answerFromIntent(
    intent: AssistantQuestionIntent,
    events: AssistantEvent[],
    now: Date,
    userId: string,
    question: string,
  ): string | null {
    const normalizedQuestion = question.trim().toLowerCase();
    const constraints = this.resolveQuestionConstraints(
      intent,
      normalizedQuestion,
      events,
    );

    switch (intent.intent) {
      case 'count_total':
        return `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`;
      case 'list_upcoming': {
        const upcoming = events.filter((event) => event.eventDate >= now);
        const matching = this.applyConstraints(upcoming, constraints, now);
        const title = this.buildFilteredTitle('Upcoming events', constraints);

        return this.formatEventList(matching, title);
      }
      case 'list_on_date': {
        if (!intent.date) {
          return null;
        }

        return this.answerSingleDayQuestion(intent.date, events);
      }
      case 'list_in_range': {
        if (!intent.startDate || !intent.endDate) {
          return null;
        }

        return this.answerDateRangeQuestion(
          intent.startDate,
          intent.endDate,
          events,
        );
      }
      case 'list_previous_week': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.formatEventList(
          events.filter(
            (event) => event.eventDate >= start && event.eventDate < now,
          ),
          'Events from the previous week',
        );
      }
      case 'list_by_tag': {
        const tag = constraints.tag;

        if (!tag) {
          return null;
        }

        const matching = this.applyConstraints(events, constraints, now);
        const title = this.buildFilteredTitle(
          `Events with tag ${tag}`,
          constraints,
        );

        return this.formatEventList(matching, title);
      }
      case 'show_participants': {
        const title =
          intent.eventTitle?.trim().toLowerCase() ??
          this.inferEventTitleFromQuestion(normalizedQuestion, events);

        if (!title) {
          return null;
        }

        return this.answerParticipantsQuestion(`"${title}"`, events);
      }
      case 'next_event': {
        const nextEvent = events
          .filter((event) => event.eventDate >= now)
          .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0];

        if (!nextEvent) {
          return 'Your next event: none.';
        }

        return `Your next event is ${nextEvent.title} on ${nextEvent.eventDate.toISOString().slice(0, 16).replace('T', ' ')}.`;
      }
      case 'where_is_event': {
        const title =
          intent.eventTitle?.trim().toLowerCase() ??
          this.inferEventTitleFromQuestion(normalizedQuestion, events);

        if (!title) {
          return null;
        }

        const event = this.findEventByTitle(events, title);

        if (!event) {
          return ASSISTANT_FALLBACK_MESSAGE;
        }

        return `"${event.title}" is at ${event.location ?? 'unknown location'}.`;
      }
      case 'list_organized': {
        const organized = events.filter(
          (event) => event.organizerId === userId,
        );
        return this.formatEventList(organized, 'Events you organize');
      }
      case 'list_attending_this_week': {
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const attending = events.filter(
          (event) =>
            event.participantIds.includes(userId) &&
            event.eventDate >= now &&
            event.eventDate <= weekEnd,
        );
        return this.formatEventList(
          attending,
          'Events you are attending this week',
        );
      }
      case 'fallback':
        return null;
      default:
        return null;
    }
  }

  private answerWhereIsFromQuestion(
    question: string,
    events: AssistantEvent[],
  ): string | null {
    const normalizedQuestion = question.trim().toLowerCase();

    if (
      !/\bwhere\s+is\b/.test(normalizedQuestion) &&
      !/\bде\b/.test(normalizedQuestion)
    ) {
      return null;
    }

    const inferredTitle = this.inferEventTitleFromQuestion(
      normalizedQuestion,
      events,
    );

    if (!inferredTitle) {
      return null;
    }

    const event = events.find((item) =>
      this.matchesEventTitle(item.title, inferredTitle),
    );

    if (!event) {
      return null;
    }

    return `"${event.title}" is at ${event.location ?? 'unknown location'}.`;
  }

  private answerParticipantsFromQuestion(
    question: string,
    events: AssistantEvent[],
  ): string | null {
    if (!this.isParticipantsQuestion(question)) {
      return null;
    }

    const answer = this.answerParticipantsQuestion(
      question.trim().toLowerCase(),
      events,
    );

    if (answer === ASSISTANT_FALLBACK_MESSAGE) {
      return null;
    }

    return answer;
  }

  private isWhereIsQuestion(question: string): boolean {
    const normalizedQuestion = question.trim().toLowerCase();

    return (
      /\bwhere\s+is\b/.test(normalizedQuestion) ||
      /\bде\b/.test(normalizedQuestion)
    );
  }

  private inferEventTitleFromQuestion(
    normalizedQuestion: string,
    events: AssistantEvent[],
  ): string | null {
    const quoted = normalizedQuestion.match(/"([^"]+)"/)?.[1]?.trim();

    if (quoted) {
      return quoted;
    }

    const matchedByContains = events.find((event) =>
      normalizedQuestion.includes(event.title.toLowerCase()),
    );

    if (matchedByContains) {
      return matchedByContains.title.toLowerCase();
    }

    const whereIsMatch = normalizedQuestion.match(
      /where\s+is\s+(?:the\s+)?(.+?)\??$/,
    );

    if (whereIsMatch?.[1]?.trim()) {
      return whereIsMatch[1].trim();
    }

    const participantsMatch = normalizedQuestion.match(
      /(?:participants?|attendees?|who.?s attending|who are attending)(?:\s+(?:for|at|in))?\s+(?:the\s+)?(.+?)\??$/,
    );

    return participantsMatch?.[1]?.trim() ?? null;
  }

  private findEventByTitle(
    events: AssistantEvent[],
    requestedTitle: string,
  ): AssistantEvent | undefined {
    return events.find((event) =>
      this.matchesEventTitle(event.title, requestedTitle),
    );
  }

  private matchesEventTitle(
    eventTitle: string,
    requestedTitle: string,
  ): boolean {
    const normalizedEventTitle = this.normalizeTitleForLookup(eventTitle);
    const normalizedRequestedTitle =
      this.normalizeTitleForLookup(requestedTitle);

    return (
      normalizedEventTitle.includes(normalizedRequestedTitle) ||
      normalizedRequestedTitle.includes(normalizedEventTitle)
    );
  }

  private normalizeTitleForLookup(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^["'`]+|["'`?.!,]+$/g, '')
      .replace(/^(the|a|an)\s+/, '')
      .replace(/\s+/g, ' ');
  }

  private hasTagIntent(normalizedQuestion: string): boolean {
    return (
      /\btags?\b/.test(normalizedQuestion) ||
      /\bтег(и|у|ом|ах)?\b/.test(normalizedQuestion)
    );
  }

  private hasEventsIntent(normalizedQuestion: string): boolean {
    return (
      /\bevents?\b/.test(normalizedQuestion) ||
      /\bпод(і|i)ї\b/.test(normalizedQuestion)
    );
  }

  private formatFilteredCount(title: string, count: number): string {
    return `${title}: ${count} event${count === 1 ? '' : 's'}.`;
  }

  private answerParticipantsQuestion(
    normalizedQuestion: string,
    events: AssistantEvent[],
  ): string {
    const quotedTitleMatch = normalizedQuestion.match(/"([^"]+)"/);
    const requestedTitle = quotedTitleMatch?.[1]?.trim();

    const matchedEvent = requestedTitle
      ? this.findEventByTitle(events, requestedTitle)
      : events.find((event) =>
          normalizedQuestion.includes(event.title.toLowerCase()),
        );

    if (!matchedEvent) {
      return ASSISTANT_FALLBACK_MESSAGE;
    }

    if (matchedEvent.participantLabels.length === 0) {
      return `"${matchedEvent.title}" has no participants yet.`;
    }

    const list = matchedEvent.participantLabels.slice(0, 10).join(', ');
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

  private getWeekendWindow(now: Date): {
    weekendStart: Date;
    weekendEnd: Date;
  } {
    const dayOfWeek = now.getUTCDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const weekendStart = new Date(now);

    weekendStart.setUTCDate(now.getUTCDate() + daysUntilSaturday);
    weekendStart.setUTCHours(0, 0, 0, 0);

    const weekendEnd = new Date(weekendStart);
    weekendEnd.setUTCDate(weekendStart.getUTCDate() + 1);
    weekendEnd.setUTCHours(23, 59, 59, 999);

    return { weekendStart, weekendEnd };
  }

  private resolveQuestionConstraints(
    intent: AssistantQuestionIntent,
    normalizedQuestion: string,
    events: AssistantEvent[],
  ): AssistantQuestionConstraints {
    const availableTags = [
      ...new Set(
        events.flatMap((event) => event.tags.map((tag) => tag.toLowerCase())),
      ),
    ];

    const inferredTag = availableTags.find((tag) =>
      normalizedQuestion.includes(tag),
    );

    return {
      tag: intent.tag?.trim().toLowerCase() || inferredTag,
      visibility:
        intent.visibility ??
        (normalizedQuestion.includes('public')
          ? 'public'
          : normalizedQuestion.includes('private')
            ? 'private'
            : undefined),
      timeRange:
        intent.timeRange ??
        (normalizedQuestion.includes('this weekend')
          ? 'this_weekend'
          : normalizedQuestion.includes('this week')
            ? 'this_week'
            : undefined),
    };
  }

  private applyConstraints(
    events: AssistantEvent[],
    constraints: AssistantQuestionConstraints,
    now: Date,
  ): AssistantEvent[] {
    return events.filter((event) => {
      if (
        constraints.tag &&
        !event.tags.some(
          (eventTag) => eventTag.toLowerCase() === constraints.tag,
        )
      ) {
        return false;
      }

      if (
        constraints.visibility &&
        event.visibility !== constraints.visibility
      ) {
        return false;
      }

      if (constraints.timeRange === 'this_week') {
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return event.eventDate >= now && event.eventDate <= weekEnd;
      }

      if (constraints.timeRange === 'this_weekend') {
        const { weekendStart, weekendEnd } = this.getWeekendWindow(now);
        return event.eventDate >= weekendStart && event.eventDate <= weekendEnd;
      }

      return true;
    });
  }

  private buildFilteredTitle(
    baseTitle: string,
    constraints: AssistantQuestionConstraints,
  ): string {
    const parts = [baseTitle];

    if (constraints.visibility) {
      parts.push(`(${constraints.visibility})`);
    }

    if (constraints.timeRange === 'this_weekend') {
      parts.push('this weekend');
    }

    if (constraints.timeRange === 'this_week') {
      parts.push('this week');
    }

    return parts.join(' ');
  }
}
