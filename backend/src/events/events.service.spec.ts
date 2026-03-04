import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let participantsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(async () => {
    eventsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    participantsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantsRepository,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create throws when eventDate is in the past', async () => {
    const user = { sub: 'user-id', email: 'user@example.com' };

    await expect(
      service.create(
        {
          title: 'Past event',
          eventDate: '2000-01-01T00:00:00.000Z',
          location: 'Kyiv',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(eventsRepository.create).not.toHaveBeenCalled();
    expect(eventsRepository.save).not.toHaveBeenCalled();
  });

  it('update throws when new eventDate is in the past', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      title: 'Event',
      location: 'Kyiv',
    });

    const user = { sub: 'organizer-id', email: 'org@example.com' };

    await expect(
      service.update(
        'event-id',
        {
          eventDate: '2000-01-01T00:00:00.000Z',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(eventsRepository.save).not.toHaveBeenCalled();
  });

  it('create stores null capacity when omitted (unlimited)', async () => {
    const user = { sub: 'user-id', email: 'user@example.com' };
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    eventsRepository.create.mockImplementation(
      (payload: Record<string, unknown>) => payload,
    );
    eventsRepository.save.mockImplementation(
      (payload: Record<string, unknown>) => payload,
    );

    const result = await service.create(
      {
        title: 'Unlimited event',
        eventDate: futureDate,
        location: 'Kyiv',
      },
      user,
    );

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unlimited event',
        location: 'Kyiv',
        organizerId: 'user-id',
        capacity: null,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        capacity: null,
      }),
    );
  });

  it('joinEvent throws when capacity is reached', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      capacity: 1,
    });
    participantsRepository.findOne.mockResolvedValue(null);
    participantsRepository.count.mockResolvedValue(1);

    await expect(
      service.joinEvent('event-id', {
        sub: 'user-id',
        email: 'user@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(participantsRepository.save).not.toHaveBeenCalled();
  });

  it('leaveEvent deletes participation for joined user', async () => {
    participantsRepository.findOne.mockResolvedValue({
      id: 'participant-id',
      eventId: 'event-id',
      userId: 'user-id',
    });

    await service.leaveEvent('event-id', {
      sub: 'user-id',
      email: 'user@example.com',
    });

    expect(participantsRepository.delete).toHaveBeenCalledWith({
      id: 'participant-id',
    });
  });
});
