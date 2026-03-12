import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssistantService } from './assistant.service';
import {
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';
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
    askQuestion: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T10:00:00.000Z'));

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
      askQuestion: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
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

    eventsRepository.find.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Tech Meetup',
        eventDate: new Date('2026-03-13T12:00:00.000Z'),
        visibility: EventVisibility.PUBLIC,
        organizerId: 'user-1',
        tags: [{ name: 'tech' }],
        participants: [{ userId: 'user-9' }, { userId: 'user-8' }],
      },
      {
        id: 'event-2',
        title: 'Retro Review',
        eventDate: new Date('2026-03-08T09:00:00.000Z'),
        visibility: EventVisibility.PRIVATE,
        organizerId: 'user-1',
        tags: [{ name: 'planning' }],
        participants: [],
      },
    ]);

    participantsRepository.find.mockResolvedValue([
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
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns count for total events', async () => {
    const result = await service.answerQuestion(
      'How many events do I have?',
      'user-1',
    );

    expect(result.answer).toBe('You have 3 events in total.');
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

    expect(result.answer).toContain('Events on 2026-03-13:');
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

  it('shows participants for specific event title', async () => {
    const result = await service.answerQuestion(
      'Show participants for "Tech Meetup"',
      'user-1',
    );

    expect(result.answer).toBe(
      'Participants for "Tech Meetup": user-9, user-8.',
    );
  });

  it('uses fallback for unsupported request', async () => {
    const result = await service.answerQuestion(
      'Can you write me a SQL migration?',
      'user-1',
    );

    expect(result.answer).toBe(ASSISTANT_FALLBACK_MESSAGE);
    expect(llmService.askQuestion).not.toHaveBeenCalled();
  });

  it('returns llm response when available', async () => {
    llmService.askQuestion.mockResolvedValueOnce(
      'You have 3 events and 2 upcoming.',
    );

    const result = await service.answerQuestion(
      'List my upcoming events',
      'user-1',
    );

    expect(result.answer).toBe('You have 3 events and 2 upcoming.');
  });

  it('falls back to local supported answer when llm returns fallback text', async () => {
    llmService.askQuestion.mockResolvedValueOnce(ASSISTANT_FALLBACK_MESSAGE);

    const result = await service.answerQuestion(
      'How many events do I have?',
      'user-1',
    );

    expect(result.answer).toBe('You have 3 events in total.');
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
});
