export type AssistantTitleLookupEvent = {
  title: string;
};

export const isParticipantsQuestionText = (question: string): boolean => {
  const normalizedQuestion = question.trim().toLowerCase();

  return /participants?|attendees?|who joined|who is joining|who.?s attending|who is attending|who are attending/.test(
    normalizedQuestion,
  );
};

export const isWhereIsQuestionText = (question: string): boolean => {
  const normalizedQuestion = question.trim().toLowerCase();

  return (
    /\bwhere\s+is\b/.test(normalizedQuestion) ||
    /\bде\b/.test(normalizedQuestion)
  );
};

export const extractIsoDates = (value: string): string[] => {
  const matches = value.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  return matches ? [...new Set(matches)] : [];
};

export const shouldUseDateFallbackQuestion = (question: string): boolean => {
  const normalizedQuestion = question.trim().toLowerCase();
  const dates = extractIsoDates(normalizedQuestion);

  const hasDateRangeIntent =
    /(from|between).*(to|and)|date range/.test(normalizedQuestion) &&
    dates.length >= 2;
  const hasSingleDayIntent =
    dates.length === 1 && /(on|for|date|day)/.test(normalizedQuestion);

  return hasDateRangeIntent || hasSingleDayIntent;
};

export const shouldUseGlobalDateScopeQuestion = (question: string): boolean => {
  if (!shouldUseDateFallbackQuestion(question)) {
    return false;
  }

  const normalizedQuestion = question.trim().toLowerCase();
  const hasExplicitMyScope =
    /\b(my|i|me|mine|myself)\b/.test(normalizedQuestion) ||
    /\b(мо[їєя]|моїх|моєю|мене|мені|я)\b/.test(normalizedQuestion);

  return !hasExplicitMyScope;
};

export const normalizeTitleForLookup = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`?.!,]+$/g, '')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
};

export const matchesEventTitle = (
  eventTitle: string,
  requestedTitle: string,
): boolean => {
  const normalizedEventTitle = normalizeTitleForLookup(eventTitle);
  const normalizedRequestedTitle = normalizeTitleForLookup(requestedTitle);

  return (
    normalizedEventTitle.includes(normalizedRequestedTitle) ||
    normalizedRequestedTitle.includes(normalizedEventTitle)
  );
};

export const inferEventTitleFromQuestionText = (
  normalizedQuestion: string,
  events: AssistantTitleLookupEvent[],
): string | null => {
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
    /(?:participants?|attendees?|who.?s attending|who is attending|who are attending)(?:\s+(?:for|at|in))?\s+(?:the\s+)?(.+?)\??$/,
  );

  return participantsMatch?.[1]?.trim() ?? null;
};

export const formatDateFromIso = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');

  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day}-${month}-${year}`;
};

export const formatDateTimeUtc = (value: Date): string => {
  const year = String(value.getUTCFullYear());
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

export const hasTagIntentInQuestion = (normalizedQuestion: string): boolean => {
  return (
    /\btags?\b/.test(normalizedQuestion) ||
    /\bтег(и|у|ом|ах)?\b/.test(normalizedQuestion)
  );
};

export const hasEventsIntentInQuestion = (
  normalizedQuestion: string,
): boolean => {
  return (
    /\bevents?\b/.test(normalizedQuestion) ||
    /\bпод(і|i)ї\b/.test(normalizedQuestion)
  );
};
