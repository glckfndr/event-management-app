import { AssistantFallbackResolver } from './assistant-fallback.resolver';
import type { AssistantEvent } from './assistant.types';

describe('AssistantFallbackResolver', () => {
  const now = new Date('2026-03-12T10:00:00.000Z');

  const events: AssistantEvent[] = [
    {
      id: 'event-1',
      title: 'Open House',
      eventDate: new Date('2026-03-20T18:00:00.000Z'),
      visibility: 'public',
      organizerId: 'user-3',
      location: 'Main Hall',
      tags: ['community'],
      participantIds: ['user-1', 'user-2'],
      participantLabels: ['Ira', 'Maks'],
    },
  ];

  it('resolves participants fallback first', () => {
    const resolver = new AssistantFallbackResolver();

    const result = resolver.resolve(
      "Who's attending the Open House?",
      events,
      now,
    );

    expect(result.source).toBe('heuristic-participants');
    expect(result.answer).toBe('Participants for "Open House": Ira, Maks.');
  });

  it('resolves location fallback for where-is questions', () => {
    const resolver = new AssistantFallbackResolver();

    const result = resolver.resolve('Where is Open House?', events, now);

    expect(result.source).toBe('heuristic-where-is');
    expect(result.answer).toBe('"Open House" is at Main Hall.');
  });

  it('uses local date rules only for date-oriented fallback questions', () => {
    const resolver = new AssistantFallbackResolver();

    const result = resolver.resolve('Show events on 2026-03-20', events, now);

    expect(result.source).toBe('local-rules-fallback');
    expect(result.answer).toContain('Events on 20-03-2026:');
  });

  it('returns transparent fallback for unsupported questions', () => {
    const resolver = new AssistantFallbackResolver();

    const result = resolver.resolve('How many events do I have?', events, now);

    expect(result.source).toBe('heuristic-fallback');
    expect(result.answer).toBeNull();
  });
});
