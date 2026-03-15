import { ASSISTANT_FALLBACK_MESSAGE } from './assistant-llm.service';
import {
  applyQuestionConstraints,
  buildFilteredTitle,
  resolveQuestionConstraints,
} from './assistant-constraints.helpers';
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

const formatFilteredCount = (title: string, count: number): string => {
  return `${title}: ${count} event${count === 1 ? '' : 's'}.`;
};

const formatEventList = (events: AssistantEvent[], title: string): string => {
  if (events.length === 0) {
    return `${title}: none.`;
  }

  const conciseList = events
    .slice(0, 8)
    .map((event) => `${event.title} (${formatDateTimeUtc(event.eventDate)})`)
    .join('; ');

  return `${title}: ${conciseList}.`;
};

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

  const tags = [
    ...new Set(
      events.flatMap((event) => event.tags.map((tag) => tag.toLowerCase())),
    ),
  ];
  const matchedTags = tags.filter((tag) => normalizedQuestion.includes(tag));
  const isTagFilterQuestion =
    hasTagIntentInQuestion(normalizedQuestion) ||
    (hasEventsIntentInQuestion(normalizedQuestion) && matchedTags.length > 0);

  if (isTagFilterQuestion) {
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

  switch (intent.intent) {
    case 'count_total':
      return `You have ${events.length} event${events.length === 1 ? '' : 's'} in total.`;
    case 'list_upcoming': {
      const upcoming = events.filter((event) => event.eventDate >= now);
      const matching = applyQuestionConstraints(upcoming, constraints, now);
      const title = buildFilteredTitle('Upcoming events', constraints);

      return formatEventList(matching, title);
    }
    case 'list_on_date': {
      if (!intent.date) {
        return null;
      }

      return answerSingleDayQuestion(intent.date, events);
    }
    case 'list_in_range': {
      if (!intent.startDate || !intent.endDate) {
        return null;
      }

      return answerDateRangeQuestion(intent.startDate, intent.endDate, events);
    }
    case 'list_previous_week': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return formatEventList(
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

      const matching = applyQuestionConstraints(events, constraints, now);
      const title = buildFilteredTitle(`Events with tag ${tag}`, constraints);

      return formatEventList(matching, title);
    }
    case 'show_participants': {
      const title =
        intent.eventTitle?.trim().toLowerCase() ??
        inferEventTitleFromQuestionText(normalizedQuestion, events);

      if (!title) {
        return null;
      }

      return answerParticipantsQuestion(`"${title}"`, events);
    }
    case 'next_event': {
      const nextEvent = events
        .filter((event) => event.eventDate >= now)
        .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0];

      if (!nextEvent) {
        return 'Your next event: none.';
      }

      return `Your next event is ${nextEvent.title} on ${formatDateTimeUtc(nextEvent.eventDate)}.`;
    }
    case 'where_is_event': {
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
    }
    case 'list_organized': {
      const organized = events.filter((event) => event.organizerId === userId);
      return formatEventList(organized, 'Events you organize');
    }
    case 'list_attending_this_week': {
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const attending = events.filter(
        (event) =>
          event.participantIds.includes(userId) &&
          event.eventDate >= now &&
          event.eventDate <= weekEnd,
      );
      return formatEventList(attending, 'Events you are attending this week');
    }
    case 'fallback':
      return null;
    default:
      return null;
  }
};
