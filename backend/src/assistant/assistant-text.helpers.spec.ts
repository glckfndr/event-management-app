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
  shouldUseDateFallbackQuestion,
  shouldUseGlobalDateScopeQuestion,
} from './assistant-text.helpers';

describe('assistant-text.helpers', () => {
  it('detects participants question variants', () => {
    expect(isParticipantsQuestionText('Who is attending the Vegetable?')).toBe(
      true,
    );
    expect(isParticipantsQuestionText('show event details')).toBe(false);
  });

  it('detects location questions', () => {
    expect(isWhereIsQuestionText('Where is the Open House?')).toBe(true);
    expect(isWhereIsQuestionText('Tell me upcoming events')).toBe(false);
  });

  it('extracts unique ISO dates', () => {
    expect(
      extractIsoDates('from 2026-03-10 to 2026-03-20 and 2026-03-10 again'),
    ).toEqual(['2026-03-10', '2026-03-20']);
  });

  it('uses date fallback and scope detection for my/global queries', () => {
    expect(
      shouldUseDateFallbackQuestion(
        'Show events from 2026-03-10 to 2026-03-20',
      ),
    ).toBe(true);
    expect(
      shouldUseGlobalDateScopeQuestion(
        'Show events from 2026-03-10 to 2026-03-20',
      ),
    ).toBe(true);
    expect(
      shouldUseGlobalDateScopeQuestion(
        'Show my events from 2026-03-10 to 2026-03-20',
      ),
    ).toBe(false);
  });

  it('infers event title from quoted and unquoted questions', () => {
    const events = [{ title: 'Open House' }, { title: 'Vegetable' }];

    expect(
      inferEventTitleFromQuestionText('where is "Open House"?', events),
    ).toBe('Open House');
    expect(
      inferEventTitleFromQuestionText('where is the vegetable?', events),
    ).toBe('vegetable');
  });

  it('matches titles ignoring punctuation and articles', () => {
    expect(matchesEventTitle('The Open House!', 'open house')).toBe(true);
    expect(matchesEventTitle('Tech Meetup', 'design sync')).toBe(false);
  });

  it('formats dates consistently', () => {
    expect(formatDateFromIso('2026-03-20')).toBe('20-03-2026');
    expect(formatDateTimeUtc(new Date('2026-03-20T18:05:00.000Z'))).toBe(
      '20-03-2026 18:05',
    );
  });

  it('detects tag and events intents', () => {
    expect(hasTagIntentInQuestion('events with tag tech')).toBe(true);
    expect(hasEventsIntentInQuestion('show events this week')).toBe(true);
  });
});
