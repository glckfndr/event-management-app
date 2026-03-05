import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { Event } from '../events/entities/event.entity';
import { EventsService } from '../events/events.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepositoryMock: Partial<Repository<User>>;
<<<<<<< HEAD
  let eventsServiceMock: {
    getCalendarForUser: jest.Mock;
  };
=======
>>>>>>> origin/main

  beforeEach(async () => {
    usersRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

<<<<<<< HEAD
    eventsServiceMock = {
      getCalendarForUser: jest.fn(),
    };

=======
>>>>>>> origin/main
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
<<<<<<< HEAD
        {
          provide: EventsService,
          useValue: eventsServiceMock,
        },
=======
>>>>>>> origin/main
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getMyEvents delegates to EventsService calendar API', async () => {
    const userId = 'user-id';
    const expectedEvents = [
      {
        id: 'event-1',
        organizerId: userId,
        eventDate: new Date('2026-07-20T12:00:00.000Z'),
        title: 'Organized Event',
      },
    ] as Event[];

    eventsServiceMock.getCalendarForUser.mockResolvedValue(expectedEvents);

    const result = await service.getMyEvents(userId);

    expect(eventsServiceMock.getCalendarForUser).toHaveBeenCalledWith(userId);
    expect(result).toEqual(expectedEvents);
  });
});
