import { AssistantScopeResolver } from './assistant-scope.resolver';
import type {
  AssistantEvent,
  AssistantQuestionIntent,
} from './assistant.types';

describe('AssistantScopeResolver', () => {
  const userEvents: AssistantEvent[] = [
    {
      id: 'event-1',
      title: 'Tech Meetup',
      eventDate: new Date('2026-03-13T12:00:00.000Z'),
      visibility: 'public',
      organizerId: 'user-1',
      location: 'Main Hall',
      tags: ['tech'],
      participantIds: ['user-2'],
      participantLabels: ['Alex'],
    },
  ];

  const globalEvents: AssistantEvent[] = [
    ...userEvents,
    {
      id: 'event-2',
      title: 'Open House',
      eventDate: new Date('2026-03-20T18:00:00.000Z'),
      visibility: 'public',
      organizerId: 'user-3',
      location: 'City Center',
      tags: ['community'],
      participantIds: [],
      participantLabels: [],
    },
  ];

  it('keeps user scope for personal date questions', async () => {
    const assistantDataService = {
      loadPublicLookupEvents: jest.fn().mockResolvedValue(globalEvents),
    };
    const resolver = new AssistantScopeResolver(assistantDataService as never);

    const result = await resolver.resolveContextEvents(
      'Show my events from 2026-03-10 to 2026-03-20',
      userEvents,
    );

    expect(result).toEqual(userEvents);
    expect(assistantDataService.loadPublicLookupEvents).not.toHaveBeenCalled();
  });

  it('expands to global scope for non-personal date questions', async () => {
    const assistantDataService = {
      loadPublicLookupEvents: jest.fn().mockResolvedValue(globalEvents),
    };
    const resolver = new AssistantScopeResolver(assistantDataService as never);

    const result = await resolver.resolveContextEvents(
      'Show events from 2026-03-10 to 2026-03-20',
      userEvents,
    );

    expect(result).toEqual(globalEvents);
    expect(assistantDataService.loadPublicLookupEvents).toHaveBeenCalledWith(
      userEvents,
    );
  });

  it('uses global lookup for location and participants intents', async () => {
    const assistantDataService = {
      loadPublicLookupEvents: jest.fn().mockResolvedValue(globalEvents),
    };
    const resolver = new AssistantScopeResolver(assistantDataService as never);

    const whereIntent: AssistantQuestionIntent = { intent: 'where_is_event' };

    const result = await resolver.resolveIntentEvents(
      whereIntent,
      'Where is Open House?',
      userEvents,
      userEvents,
    );

    expect(result).toEqual(globalEvents);
    expect(assistantDataService.loadPublicLookupEvents).toHaveBeenCalledWith(
      userEvents,
    );
  });

  it('keeps context events for non-lookup intent and neutral question', async () => {
    const assistantDataService = {
      loadPublicLookupEvents: jest.fn().mockResolvedValue(globalEvents),
    };
    const resolver = new AssistantScopeResolver(assistantDataService as never);

    const listIntent: AssistantQuestionIntent = { intent: 'list_upcoming' };

    const result = await resolver.resolveIntentEvents(
      listIntent,
      'List my upcoming events',
      userEvents,
      userEvents,
    );

    expect(result).toEqual(userEvents);
    expect(assistantDataService.loadPublicLookupEvents).not.toHaveBeenCalled();
  });
});
