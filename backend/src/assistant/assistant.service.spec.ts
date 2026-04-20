import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssistantService } from './assistant.service';
import {
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';
import { AssistantDataService } from './assistant-data.service';
import { AssistantScopeResolver } from './assistant-scope.resolver';
import { AssistantFallbackResolver } from './assistant-fallback.resolver';
import { EventVisibility } from '../events/entities/event.entity';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

describe('AssistantService', () => {
  let service: AssistantService;

  let eventsRepository: {
    find: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  let participantsRepository: {
    find: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  let llmService: {
    classifyQuestion: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    // Freeze time so date-relative assistant rules stay deterministic.
    jest.setSystemTime(new Date('2026-03-12T10:00:00.000Z'));
    delete process.env.AI_API_KEY;

    eventsRepository = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    participantsRepository = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    llmService = {
      classifyQuestion: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        AssistantDataService,
        AssistantScopeResolver,
        AssistantFallbackResolver,
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantsRepository,
        },
        {
          provide: AssistantLlmService,
          useValue: llmService,
        },
      ],
    }).compile();

    service = module.get<AssistantService>(AssistantService);

    const organizedEvents = [
      {
        id: 'event-1',
        title: 'Tech Meetup',
        eventDate: new Date('2026-03-13T12:00:00.000Z'),
        visibility: EventVisibility.PUBLIC,
        organizerId: 'user-1',
        tags: [{ name: 'tech' }],
        participants: [
          {
            userId: 'user-9',
            user: { name: 'Alice Nguyen', email: 'alice@example.com' },
          },
          {
            userId: 'user-8',
            user: { email: 'bob@example.com' },
          },
        ],
      },
      {
        id: 'event-2',
        title: 'Retro Review',
        eventDate: new Date('2026-03-08T09:00:00.000Z'),
        visibility: EventVisibility.PRIVATE,
        location: 'Conference Room B',
        organizerId: 'user-1',
        tags: [{ name: 'planning' }],
        participants: [],
      },
    ];

    const discoverablePublicEvents = [
      {
        id: 'event-4',
        title: 'Open House',
        eventDate: new Date('2026-03-20T18:00:00.000Z'),
        visibility: EventVisibility.PUBLIC,
        location: 'Main Hall',
        organizerId: 'user-1',
        tags: [{ name: 'community' }],
        participants: [],
      },
      {
        id: 'event-5',
        title: 'Vegetable',
        eventDate: new Date('2026-03-21T10:00:00.000Z'),
        visibility: EventVisibility.PUBLIC,
        location: 'Paris',
        organizerId: 'user-3',
        tags: [{ name: 'food' }],
        participants: [],
      },
    ];

    eventsRepository.find.mockImplementation((options?: unknown) => {
      const where = (options as { where?: Record<string, unknown> } | undefined)
        ?.where;

      if (where?.organizerId === 'user-1') {
        return organizedEvents;
      }

      if (where?.organizerId === 'user-2') {
        return [];
      }

      if (where?.visibility === EventVisibility.PUBLIC) {
        // Discovery scope includes the user's public events + all other public ones.
        return [
          ...organizedEvents.filter(
            (event) => event.visibility === EventVisibility.PUBLIC,
          ),
          ...discoverablePublicEvents,
        ];
      }

      return organizedEvents;
    });

    participantsRepository.find.mockImplementation((options?: unknown) => {
      const where = (options as { where?: Record<string, unknown> } | undefined)
        ?.where;

      if (where?.userId === 'user-2') {
        return [];
      }

      return [
        {
          id: 'part-1',
          userId: 'user-1',
          event: {
            id: 'event-3',
            title: 'Design Sync',
            eventDate: new Date('2026-03-15T15:30:00.000Z'),
            visibility: EventVisibility.PUBLIC,
            organizerId: 'user-2',
            tags: [{ name: 'design' }, { name: 'tech' }, { name: 'marketing' }],
            participants: [{ userId: 'user-1' }, { userId: 'user-4' }],
          },
        },
      ];
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AI_API_KEY;
  });

  it('returns count for total events', async () => {
    const result = await service.answerQuestion(
      'How many events do I have?',
      'user-1',
    );

    expect(result.answer).toBe('You have 3 events in total.');
    expect(llmService.classifyQuestion).not.toHaveBeenCalled();
  });

  it('counts upcoming events instead of total for specific count question', async () => {
    const result = await service.answerQuestion(
      'How many upcoming events do I have?',
      'user-1',
    );

    expect(result.answer).toBe('Upcoming events: 2 events.');
  });

  it('counts events by tag instead of total for specific count question', async () => {
    const result = await service.answerQuestion(
      'How many events with tag tech do I have?',
      'user-1',
    );

    expect(result.answer).toBe('Events with tag tech: 2 events.');
  });

  it('counts events on specific day instead of total for specific count question', async () => {
    const result = await service.answerQuestion(
      'How many events do I have on 2026-03-13?',
      'user-1',
    );

    expect(result.answer).toBe('Events on 13-03-2026: 1 event.');
  });

  it('lists upcoming events', async () => {
    const result = await service.answerQuestion(
      'List my upcoming events',
      'user-1',
    );

    expect(result.answer).toContain('Upcoming events:');
    expect(result.answer).toContain('Tech Meetup');
    expect(result.answer).toContain('Design Sync');
    expect(result.answer).not.toContain('Retro Review');
  });

  it('shows events for a specific day', async () => {
    const result = await service.answerQuestion(
      'What events do I have on 2026-03-13?',
      'user-1',
    );

    expect(result.answer).toContain('Events on 13-03-2026:');
    expect(result.answer).toContain('Tech Meetup');
    expect(result.answer).not.toContain('Design Sync');
  });

  it('lists events from the previous week', async () => {
    const result = await service.answerQuestion(
      'List my events from previous week',
      'user-1',
    );

    expect(result.answer).toContain('Events from the previous week:');
    expect(result.answer).toContain('Retro Review');
  });

  it('filters events by tag', async () => {
    const result = await service.answerQuestion(
      'Show events with tag tech',
      'user-1',
    );

    expect(result.answer).toContain('Events with tag tech:');
    expect(result.answer).toContain('Tech Meetup');
    expect(result.answer).toContain('Design Sync');
  });

  it('filters events by tag for plain natural-language wording', async () => {
    const result = await service.answerQuestion(
      'Show my tech events',
      'user-1',
    );

    expect(result.answer).toContain('Events with tag tech:');
    expect(result.answer).toContain('Tech Meetup');
    expect(result.answer).toContain('Design Sync');
  });

  it('shows participants for specific event title', async () => {
    const result = await service.answerQuestion(
      'Show participants for "Tech Meetup"',
      'user-1',
    );

    expect(result.answer).toBe(
      'Participants for "Tech Meetup": Alice Nguyen, user-8.',
    );
  });

  it('uses fallback for unsupported request', async () => {
    const result = await service.answerQuestion(
      'Can you write me a SQL migration?',
      'user-1',
    );

    expect(result.answer).toBe(ASSISTANT_FALLBACK_MESSAGE);
    expect(llmService.classifyQuestion).not.toHaveBeenCalled();
  });

  it('returns fallback for unsupported query when llm returns fallback intent', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'Summarize my schedule with extra insights',
      'user-1',
    );

    expect(result.answer).toBe(ASSISTANT_FALLBACK_MESSAGE);
  });

  it('answers event location even when llm returns fallback intent', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'Where is the Retro Review?',
      'user-1',
    );

    expect(result.answer).toBe('"Retro Review" is at Conference Room B.');
  });

  it('answers public event location for non-organizer with no participants', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'Where is Open House?',
      'user-2',
    );

    expect(result.answer).toBe('"Open House" is at Main Hall.');
  });

  it('answers participants for non-organizer public event when llm returns fallback intent', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      "Who's attending the Open House?",
      'user-2',
    );

    expect(result.answer).toBe('"Open House" has no participants yet.');
  });

  it('answers participants for "who is attending" phrasing', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'Who is attending the Vegetable?',
      'user-2',
    );

    expect(result.answer).toBe('"Vegetable" has no participants yet.');
  });

  it('infers event title for show_participants intent when classifier omits eventTitle', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'show_participants',
    });

    const result = await service.answerQuestion(
      "Who's attending the Open House?",
      'user-2',
    );

    expect(result.answer).toBe('"Open House" has no participants yet.');
  });

  it('matches show_participants intent when classifier includes leading article in eventTitle', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'show_participants',
      eventTitle: 'the Open House',
    });

    const result = await service.answerQuestion(
      "Who's attending the Open House?",
      'user-2',
    );

    expect(result.answer).toBe('"Open House" has no participants yet.');
  });

  it('recovers where-is question when llm misclassifies intent without required fields', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'list_on_date',
    });

    const result = await service.answerQuestion(
      'Where is the Open House?',
      'user-2',
    );

    expect(result.answer).toBe('"Open House" is at Main Hall.');
  });

  it('answers exact vegetable where-is case for non-member event with no participants', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'list_on_date',
    });

    const result = await service.answerQuestion(
      'where is the vegetable?',
      'user-2',
    );

    expect(result.answer).toBe('"Vegetable" is at Paris.');
  });

  it('recovers date range query with local rules when llm returns fallback intent', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'Show my events from 2026-03-10 to 2026-03-20',
      'user-1',
    );

    expect(result.answer).toContain('Events from 10-03-2026 to 20-03-2026:');
    expect(result.answer).toContain('Tech Meetup');
    expect(result.answer).toContain('Design Sync');
    expect(result.answer).not.toContain('Retro Review');
  });

  it('distinguishes global and personal date range queries', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion
      .mockResolvedValueOnce({ intent: 'fallback' })
      .mockResolvedValueOnce({ intent: 'fallback' });

    const globalResult = await service.answerQuestion(
      'Show events from 2026-03-10 to 2026-03-20',
      'user-1',
    );

    const personalResult = await service.answerQuestion(
      'Show my events from 2026-03-10 to 2026-03-20',
      'user-1',
    );

    expect(globalResult.answer).toContain('Open House');
    expect(personalResult.answer).not.toContain('Open House');
    expect(personalResult.answer).toContain('Tech Meetup');
    expect(personalResult.answer).toContain('Design Sync');
  });

  it('prefers llm answer for supported query when api key is configured', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'list_upcoming',
    });

    const result = await service.answerQuestion(
      'List my upcoming events',
      'user-1',
    );

    expect(result.answer).toContain('Upcoming events:');
    expect(llmService.classifyQuestion).toHaveBeenCalledTimes(1);
  });

  it('applies visibility and weekend filters for tag intent', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'list_by_tag',
      tag: 'tech',
      visibility: 'public',
      timeRange: 'this_weekend',
    });

    const result = await service.answerQuestion(
      'Show public tech events this weekend',
      'user-1',
    );

    expect(result.answer).toContain(
      'Events with tag tech (public) this weekend:',
    );
    expect(result.answer).toContain('Design Sync');
    expect(result.answer).not.toContain('Tech Meetup');
  });

  it('applies question constraints when llm classifies as list_upcoming', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'list_upcoming',
    });

    const result = await service.answerQuestion(
      'Show public tech events this weekend',
      'user-1',
    );

    expect(result.answer).toContain('Upcoming events (public) this weekend:');
    expect(result.answer).toContain('Design Sync');
    expect(result.answer).not.toContain('Tech Meetup');
  });

  it('omits participant identifiers in llm snapshot for non-participant questions', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'count_total',
    });

    await service.answerQuestion('How many events do I have?', 'user-1');

    const classifyCalls = llmService.classifyQuestion.mock.calls as Array<
      [
        string,
        { currentUserId: string; events: Array<Record<string, unknown>> },
      ]
    >;
    const snapshot = classifyCalls[0]?.[1];

    expect(snapshot).toBeDefined();

    if (!snapshot) {
      throw new Error('Expected classifyQuestion snapshot payload');
    }

    const typedSnapshot = snapshot as {
      currentUserId: string;
      events: Array<Record<string, unknown>>;
    };

    expect(typedSnapshot.currentUserId).toBe('user-1');
    expect(typedSnapshot.events[0]).not.toHaveProperty('id');
    expect(typedSnapshot.events[0]).not.toHaveProperty('organizerId');
    expect(typedSnapshot.events[0]).not.toHaveProperty('participantIds');
    expect(typedSnapshot.events[0]).toHaveProperty('relationToUser');
    expect(typedSnapshot.events[0]).toHaveProperty('participantCount');
  });

  it('includes participant identifiers in llm snapshot for participant questions', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({
      intent: 'show_participants',
      eventTitle: 'Tech Meetup',
    });

    await service.answerQuestion(
      'Show participants for "Tech Meetup"',
      'user-1',
    );

    const classifyCalls = llmService.classifyQuestion.mock.calls as Array<
      [string, { events: Array<Record<string, unknown>> }]
    >;
    const snapshot = classifyCalls[0]?.[1];

    expect(snapshot).toBeDefined();

    if (!snapshot) {
      throw new Error('Expected classifyQuestion snapshot payload');
    }

    const typedSnapshot = snapshot as {
      events: Array<Record<string, unknown>>;
    };

    expect(typedSnapshot.events[0]).toHaveProperty('participantIds');
  });

  it('returns fallback when llm returns fallback text for supported query', async () => {
    process.env.AI_API_KEY = 'test-key';
    llmService.classifyQuestion.mockResolvedValueOnce({ intent: 'fallback' });

    const result = await service.answerQuestion(
      'How many events do I have?',
      'user-1',
    );

    expect(result.answer).toBe(ASSISTANT_FALLBACK_MESSAGE);
  });

  it('ignores participant rows without event relation', async () => {
    participantsRepository.find.mockResolvedValueOnce([
      {
        id: 'part-1',
        userId: 'user-1',
        event: {
          id: 'event-3',
          title: 'Design Sync',
          eventDate: new Date('2026-03-15T15:30:00.000Z'),
          visibility: EventVisibility.PUBLIC,
          organizerId: 'user-2',
          tags: [{ name: 'design' }, { name: 'tech' }],
          participants: [{ userId: 'user-1' }, { userId: 'user-4' }],
        },
      },
      {
        id: 'part-2',
        userId: 'user-1',
        event: null,
      },
    ]);

    const result = await service.answerQuestion(
      'How many events do I have?',
      'user-1',
    );

    expect(result.answer).toBe('You have 3 events in total.');
  });

  it('performs read-only operations', async () => {
    await service.answerQuestion('How many events do I have?', 'user-1');

    expect(eventsRepository.find).toHaveBeenCalled();
    expect(participantsRepository.find).toHaveBeenCalled();
    expect(eventsRepository.save).not.toHaveBeenCalled();
    expect(eventsRepository.update).not.toHaveBeenCalled();
    expect(eventsRepository.delete).not.toHaveBeenCalled();
    expect(participantsRepository.save).not.toHaveBeenCalled();
    expect(participantsRepository.update).not.toHaveBeenCalled();
    expect(participantsRepository.delete).not.toHaveBeenCalled();
  });

  it('returns fallback when classifyQuestion returns null (e.g. network failure)', async () => {
    // API key is set so LLM path is taken, but classifyQuestion returns null
    // (simulating a network error or abort). Confirms the full fallback chain.
    process.env.AI_API_KEY = 'test-key';

    const result = await service.answerQuestion(
      'Can you explain quantum computing?',
      'user-1',
    );

    expect(result.answer).toBe(ASSISTANT_FALLBACK_MESSAGE);
    expect(llmService.classifyQuestion).toHaveBeenCalledTimes(1);
  });
});
