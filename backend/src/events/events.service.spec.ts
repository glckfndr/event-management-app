import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

describe('EventsService', () => {
  let service: EventsService;
  let transactionManager: {
    getRepository: jest.Mock;
  };
  let transactionalEventsRepository: {
    createQueryBuilder: jest.Mock;
  };
  let transactionalParticipantsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
  };
  let eventQueryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let eventsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
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
    eventQueryBuilder = {
      setLock: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn(),
    };

    eventQueryBuilder.setLock.mockReturnValue(eventQueryBuilder);
    eventQueryBuilder.where.mockReturnValue(eventQueryBuilder);

    transactionalEventsRepository = {
      createQueryBuilder: jest.fn(),
    };

    transactionalEventsRepository.createQueryBuilder.mockReturnValue(
      eventQueryBuilder,
    );

    transactionalParticipantsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    transactionManager = {
      getRepository: jest.fn(),
    };

    transactionManager.getRepository.mockImplementation((entity) => {
      if (entity === Event) {
        return transactionalEventsRepository;
      }

      if (entity === Participant) {
        return transactionalParticipantsRepository;
      }

      return undefined;
    });

    eventsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };

    eventsRepository.manager.transaction.mockImplementation(
      (
        callback: (manager: typeof transactionManager) => Promise<void> | void,
      ) => Promise.resolve(callback(transactionManager)),
    );

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
    ).rejects.toBeInstanceOf(BadRequestException);

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
    ).rejects.toBeInstanceOf(BadRequestException);

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

  it('findOne returns public event without authentication', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      visibility: 'public',
      organizerId: 'organizer-id',
      participants: [],
    });

    const result = await service.findOne('event-id');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'event-id',
      }),
    );
  });

  it('findOne throws when unauthenticated user requests private event', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      visibility: 'private',
      organizerId: 'organizer-id',
      participants: [],
    });

    await expect(service.findOne('event-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('findOne returns private event to organizer', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      visibility: 'private',
      organizerId: 'organizer-id',
      participants: [],
    });

    const result = await service.findOne('event-id', {
      sub: 'organizer-id',
      email: 'organizer@example.com',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'event-id',
      }),
    );
  });

  it('findOne returns private event to participant', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      visibility: 'private',
      organizerId: 'organizer-id',
      participants: [{ userId: 'participant-id' }],
    });

    const result = await service.findOne('event-id', {
      sub: 'participant-id',
      email: 'participant@example.com',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'event-id',
      }),
    );
  });

  it('findOne throws when authenticated non-member requests private event', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      visibility: 'private',
      organizerId: 'organizer-id',
      participants: [{ userId: 'participant-id' }],
    });

    await expect(
      service.findOne('event-id', {
        sub: 'another-user',
        email: 'another@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('joinEvent throws when capacity is reached', async () => {
    eventQueryBuilder.getOne.mockResolvedValue({
      id: 'event-id',
      capacity: 1,
    });
    transactionalParticipantsRepository.findOne.mockResolvedValue(null);
    transactionalParticipantsRepository.count.mockResolvedValue(1);

    await expect(
      service.joinEvent('event-id', {
        sub: 'user-id',
        email: 'user@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionalParticipantsRepository.save).not.toHaveBeenCalled();
  });

  it('joinEvent uses transaction and pessimistic write lock', async () => {
    eventQueryBuilder.getOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'another-user',
      capacity: 10,
    });
    transactionalParticipantsRepository.findOne.mockResolvedValue(null);
    transactionalParticipantsRepository.count.mockResolvedValue(0);
    transactionalParticipantsRepository.create.mockReturnValue({
      id: 'participant-id',
      eventId: 'event-id',
      userId: 'user-id',
    });
    transactionalParticipantsRepository.save.mockResolvedValue({
      id: 'participant-id',
    });

    await service.joinEvent('event-id', {
      sub: 'user-id',
      email: 'user@example.com',
    });

    expect(eventsRepository.manager.transaction).toHaveBeenCalled();
    expect(
      transactionalEventsRepository.createQueryBuilder,
    ).toHaveBeenCalledWith('event');
    expect(eventQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(eventQueryBuilder.where).toHaveBeenCalledWith('event.id = :id', {
      id: 'event-id',
    });
  });

  it('joinEvent throws when organizer tries to join own event', async () => {
    eventQueryBuilder.getOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      capacity: null,
    });

    await expect(
      service.joinEvent('event-id', {
        sub: 'organizer-id',
        email: 'organizer@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(transactionalParticipantsRepository.findOne).not.toHaveBeenCalled();
    expect(transactionalParticipantsRepository.save).not.toHaveBeenCalled();
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
