import { ASSISTANT_FALLBACK_MESSAGE } from './assistant-llm.service';
import {
  applyQuestionConstraints,
  buildFilteredTitle,
  resolveQuestionConstraints,
  type AssistantQuestionConstraints,
} from './assistant-constraints.helpers';
import {
  formatEventList,
  formatFilteredCount,
} from './assistant-format.helpers';
import {
  extractIsoDates,
  formatDateFromIso,
  formatDateTimeUtc,
  hasEventsIntentInQuestion,
  hasTagIntentInQuestion,
  inferEventTitleFromQuestionText,
  isParticipantsQuestionText,
  isWhereIsQuestionText,
  matchesEventTitle,
} from './assistant-text.helpers';
import type {
  AssistantEvent,
  AssistantQuestionIntent,
} from './assistant.types';

const findEventByTitle = (
  events: AssistantEvent[],
  requestedTitle: string,
): AssistantEvent | undefined => {
  return events.find((event) => matchesEventTitle(event.title, requestedTitle));
};

const answerParticipantsQuestion = (
  normalizedQuestion: string,
  events: AssistantEvent[],
): string => {
  // Prefer explicitly quoted titles to avoid accidental partial matches.
  const quotedTitleMatch = normalizedQuestion.match(/"([^"]+)"/);
  const requestedTitle = quotedTitleMatch?.[1]?.trim();

  const matchedEvent = requestedTitle
    ? findEventByTitle(events, requestedTitle)
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
};

const answerDateRangeQuestion = (
  startDateIso: string,
  endDateIso: string,
  events: AssistantEvent[],
): string => {
  const startDate = new Date(`${startDateIso}T00:00:00.000Z`);
  const endDate = new Date(`${endDateIso}T23:59:59.999Z`);

  const matchingEvents = events.filter(
    (event) => event.eventDate >= startDate && event.eventDate <= endDate,
  );

  return formatEventList(
    matchingEvents,
    `Events from ${formatDateFromIso(startDateIso)} to ${formatDateFromIso(endDateIso)}`,
  );
};

const answerSingleDayQuestion = (
  dateIso: string,
  events: AssistantEvent[],
): string => {
  const start = new Date(`${dateIso}T00:00:00.000Z`);
  const end = new Date(`${dateIso}T23:59:59.999Z`);

  const matchingEvents = events.filter(
    (event) => event.eventDate >= start && event.eventDate <= end,
  );

  return formatEventList(
    matchingEvents,
    `Events on ${formatDateFromIso(dateIso)}`,
  );
};

type RuleResolverInput = {
  normalizedQuestion: string;
  isCountQuestion: boolean;
  events: AssistantEvent[];
  now: Date;
};

const resolveDateRuleAnswer = ({
  normalizedQuestion,
  isCountQuestion,
  events,
}: RuleResolverInput): string | null => {
  // Reuse ISO date extraction for both single-day and date-range intents.
  const dates = extractIsoDates(normalizedQuestion);
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

      return formatFilteredCount(
        `Events from ${formatDateFromIso(dates[0])} to ${formatDateFromIso(dates[1])}`,
        matchingEvents.length,
      );
    }

    return answerDateRangeQuestion(dates[0], dates[1], events);
  }

  if (dates.length === 1 && /(on|for|date|day)/.test(normalizedQuestion)) {
    if (isCountQuestion) {
      const start = new Date(`${dates[0]}T00:00:00.000Z`);
      const end = new Date(`${dates[0]}T23:59:59.999Z`);
      const matchingEvents = events.filter(
        (event) => event.eventDate >= start && event.eventDate <= end,
      );

      return formatFilteredCount(
        `Events on ${formatDateFromIso(dates[0])}`,
        matchingEvents.length,
      );
    }

    return answerSingleDayQuestion(dates[0], events);
  }

  return null;
};

const resolveTemporalRuleAnswer = ({
  normalizedQuestion,
  isCountQuestion,
  events,
  now,
}: RuleResolverInput): string | null => {
  if (/previous week|past week|last week/.test(normalizedQuestion)) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const matchingEvents = events.filter(
      (event) => event.eventDate >= start && event.eventDate < now,
    );

    if (isCountQuestion) {
      return formatFilteredCount(
        'Events from the previous week',
        matchingEvents.length,
      );
    }

    return formatEventList(matchingEvents, 'Events from the previous week');
  }

  if (/past events?/.test(normalizedQuestion)) {
    const matchingEvents = events.filter((event) => event.eventDate < now);

    if (isCountQuestion) {
      return formatFilteredCount('Past events', matchingEvents.length);
    }

    return formatEventList(matchingEvents, 'Past events');
  }

  if (/upcoming|next|future/.test(normalizedQuestion)) {
    const matchingEvents = events.filter((event) => event.eventDate >= now);

    if (isCountQuestion) {
      return formatFilteredCount('Upcoming events', matchingEvents.length);
    }

    return formatEventList(matchingEvents, 'Upcoming events');
  }

  return null;
};

const resolveTagRuleAnswer = ({
  normalizedQuestion,
  isCountQuestion,
  events,
}: RuleResolverInput): string | null => {
  // Match only against tags that actually exist in the current dataset.
  const tags = [
    ...new Set(
      events.flatMap((event) => event.tags.map((tag) => tag.toLowerCase())),
    ),
  ];
  const matchedTags = tags.filter((tag) => normalizedQuestion.includes(tag));
  const isTagFilterQuestion =
    hasTagIntentInQuestion(normalizedQuestion) ||
    (hasEventsIntentInQuestion(normalizedQuestion) && matchedTags.length > 0);

  if (!isTagFilterQuestion) {
    return null;
  }

  if (matchedTags.length === 0) {
    return 'I could not find the requested tag in your events.';
  }

  const matchingEvents = events.filter((event) =>
    event.tags.some((tag) => matchedTags.includes(tag.toLowerCase())),
  );

  if (isCountQuestion) {
    return formatFilteredCount(
      `Events with tag ${matchedTags.join(', ')}`,
      matchingEvents.length,
    );
  }

  return formatEventList(
    matchingEvents,
    `Events with tag ${matchedTags.join(', ')}`,
  );
};

type IntentHandlerContext = {
  intent: AssistantQuestionIntent;
  events: AssistantEvent[];
  now: Date;
  userId: string;
  normalizedQuestion: string;
  constraints: AssistantQuestionConstraints;
};

type IntentHandler = (context: IntentHandlerContext) => string | null;

const intentHandlers: Record<AssistantQuestionIntent['intent'], IntentHandler> =
  {
    count_total: ({ events }) =>
      `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`,
    list_upcoming: ({ events, now, constraints }) => {
      const upcoming = events.filter((event) => event.eventDate >= now);
      // Apply optional LLM-derived filters (tag/visibility/time-window).
      const matching = applyQuestionConstraints(upcoming, constraints, now);
      const title = buildFilteredTitle('Upcoming events', constraints);

      return formatEventList(matching, title);
    },
    list_on_date: ({ intent, events }) => {
      if (!intent.date) {
        return null;
      }

      return answerSingleDayQuestion(intent.date, events);
    },
    list_in_range: ({ intent, events }) => {
      if (!intent.startDate || !intent.endDate) {
        return null;
      }

      return answerDateRangeQuestion(intent.startDate, intent.endDate, events);
    },
    list_previous_week: ({ events, now }) => {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return formatEventList(
        events.filter(
          (event) => event.eventDate >= start && event.eventDate < now,
        ),
        'Events from the previous week',
      );
    },
    list_by_tag: ({ events, now, constraints }) => {
      const tag = constraints.tag;

      if (!tag) {
        return null;
      }

      const matching = applyQuestionConstraints(events, constraints, now);
      const title = buildFilteredTitle(`Events with tag ${tag}`, constraints);

      return formatEventList(matching, title);
    },
    show_participants: ({ intent, normalizedQuestion, events }) => {
      const title =
        intent.eventTitle?.trim().toLowerCase() ??
        inferEventTitleFromQuestionText(normalizedQuestion, events);

      if (!title) {
        return null;
      }

      return answerParticipantsQuestion(`"${title}"`, events);
    },
    next_event: ({ events, now }) => {
      const nextEvent = events
        .filter((event) => event.eventDate >= now)
        .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0];

      if (!nextEvent) {
        return 'Your next event: none.';
      }

      return `Your next event is ${nextEvent.title} on ${formatDateTimeUtc(nextEvent.eventDate)}.`;
    },
    where_is_event: ({ intent, normalizedQuestion, events }) => {
      const title =
        intent.eventTitle?.trim().toLowerCase() ??
        inferEventTitleFromQuestionText(normalizedQuestion, events);

      if (!title) {
        return null;
      }

      const event = findEventByTitle(events, title);

      if (!event) {
        return ASSISTANT_FALLBACK_MESSAGE;
      }

      return `"${event.title}" is at ${event.location ?? 'unknown location'}.`;
    },
    list_organized: ({ events, userId }) => {
      const organized = events.filter((event) => event.organizerId === userId);
      return formatEventList(organized, 'Events you organize');
    },
    list_attending_this_week: ({ events, userId, now }) => {
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const attending = events.filter(
        (event) =>
          event.participantIds.includes(userId) &&
          event.eventDate >= now &&
          event.eventDate <= weekEnd,
      );

      return formatEventList(attending, 'Events you are attending this week');
    },
    fallback: () => null,
  };

export const answerWhereIsFromQuestion = (
  question: string,
  events: AssistantEvent[],
): string | null => {
  const normalizedQuestion = question.trim().toLowerCase();

  if (!isWhereIsQuestionText(normalizedQuestion)) {
    return null;
  }

  const inferredTitle = inferEventTitleFromQuestionText(
    normalizedQuestion,
    events,
  );

  if (!inferredTitle) {
    return null;
  }

  const event = events.find((item) =>
    matchesEventTitle(item.title, inferredTitle),
  );

  if (!event) {
    return null;
  }

  return `"${event.title}" is at ${event.location ?? 'unknown location'}.`;
};

export const answerParticipantsFromQuestion = (
  question: string,
  events: AssistantEvent[],
): string | null => {
  if (!isParticipantsQuestionText(question)) {
    return null;
  }

  const answer = answerParticipantsQuestion(
    question.trim().toLowerCase(),
    events,
  );

  if (answer === ASSISTANT_FALLBACK_MESSAGE) {
    return null;
  }

  return answer;
};

export const answerFromRules = (
  question: string,
  events: AssistantEvent[],
  now: Date,
): string | null => {
  const normalizedQuestion = question.trim().toLowerCase();
  const isCountQuestion =
    /(how many|count|total)/.test(normalizedQuestion) &&
    /events?/.test(normalizedQuestion);

  if (!normalizedQuestion) {
    return null;
  }

  if (isParticipantsQuestionText(normalizedQuestion)) {
    return answerParticipantsQuestion(normalizedQuestion, events);
  }

  const dateRuleAnswer = resolveDateRuleAnswer({
    normalizedQuestion,
    isCountQuestion,
    events,
    now,
  });

  if (dateRuleAnswer) {
    return dateRuleAnswer;
  }

  const temporalRuleAnswer = resolveTemporalRuleAnswer({
    normalizedQuestion,
    isCountQuestion,
    events,
    now,
  });

  if (temporalRuleAnswer) {
    return temporalRuleAnswer;
  }

  const tagRuleAnswer = resolveTagRuleAnswer({
    normalizedQuestion,
    isCountQuestion,
    events,
    now,
  });

  if (tagRuleAnswer) {
    return tagRuleAnswer;
  }

  if (isCountQuestion) {
    return `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`;
  }

  return null;
};

export const answerFromIntent = (
  intent: AssistantQuestionIntent,
  events: AssistantEvent[],
  now: Date,
  userId: string,
  question: string,
): string | null => {
  const normalizedQuestion = question.trim().toLowerCase();
  const constraints = resolveQuestionConstraints(
    intent,
    normalizedQuestion,
    events,
  );

  const handler = intentHandlers[intent.intent];

  return handler({
    intent,
    events,
    now,
    userId,
    normalizedQuestion,
    constraints,
  });
};
