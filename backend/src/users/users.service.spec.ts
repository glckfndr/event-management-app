import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepositoryMock: Partial<Repository<User>>;
  let eventsRepositoryMock: Partial<Repository<Event>>;
  let participantsRepositoryMock: Partial<Repository<Participant>>;

  beforeEach(async () => {
    usersRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    eventsRepositoryMock = {
      find: jest.fn(),
    };

    participantsRepositoryMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepositoryMock,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantsRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
