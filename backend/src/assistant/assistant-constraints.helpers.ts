type AssistantFilterableEvent = {
  eventDate: Date;
  visibility: 'public' | 'private';
  tags: string[];
};

type AssistantQuestionIntentLike = {
  tag?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};

export type AssistantQuestionConstraints = {
  tag?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};

const getWeekendWindow = (
  now: Date,
): {
  weekendStart: Date;
  weekendEnd: Date;
} => {
  const dayOfWeek = now.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const weekendStart = new Date(now);

  weekendStart.setUTCDate(now.getUTCDate() + daysUntilSaturday);
  weekendStart.setUTCHours(0, 0, 0, 0);

  const weekendEnd = new Date(weekendStart);
  weekendEnd.setUTCDate(weekendStart.getUTCDate() + 1);
  weekendEnd.setUTCHours(23, 59, 59, 999);

  return { weekendStart, weekendEnd };
};

export const resolveQuestionConstraints = (
  intent: AssistantQuestionIntentLike,
  normalizedQuestion: string,
  events: AssistantFilterableEvent[],
): AssistantQuestionConstraints => {
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
};

export const applyQuestionConstraints = <
  TEvent extends AssistantFilterableEvent,
>(
  events: TEvent[],
  constraints: AssistantQuestionConstraints,
  now: Date,
): TEvent[] => {
  return events.filter((event) => {
    if (
      constraints.tag &&
      !event.tags.some((eventTag) => eventTag.toLowerCase() === constraints.tag)
    ) {
      return false;
    }

    if (constraints.visibility && event.visibility !== constraints.visibility) {
      return false;
    }

    if (constraints.timeRange === 'this_week') {
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return event.eventDate >= now && event.eventDate <= weekEnd;
    }

    if (constraints.timeRange === 'this_weekend') {
      const { weekendStart, weekendEnd } = getWeekendWindow(now);
      return event.eventDate >= weekendStart && event.eventDate <= weekendEnd;
    }

    return true;
  });
};

export const buildFilteredTitle = (
  baseTitle: string,
  constraints: AssistantQuestionConstraints,
): string => {
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
};
