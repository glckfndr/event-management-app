import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    eventsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepository,
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
});
