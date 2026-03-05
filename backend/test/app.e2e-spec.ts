import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { EventsController } from './../src/events/events.controller';
import { EventsService } from './../src/events/events.service';
import { Event, EventVisibility } from './../src/events/entities/event.entity';
import { Participant } from './../src/participants/entities/participant.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    return request(httpServer)
      .get('/')
      .expect(200)
      .expect('Hello Event Management!');
  });
});

describe('EventsController (e2e)', () => {
  let app: INestApplication;
  let eventsRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
  };
  let participantsRepository: {
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeAll(async () => {
    eventsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };

    participantsRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
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

    app = moduleFixture.createNestApplication();

    app.use(
      (
        req: {
          headers: Record<string, string | string[] | undefined>;
          user?: { sub: string; email: string };
        },
        _res: unknown,
        next: () => void,
      ) => {
        const authHeader = req.headers.authorization;
        const token =
          typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : undefined;

        if (token === 'organizer-token') {
          req.user = { sub: 'organizer-id', email: 'organizer@example.com' };
        }

        if (token === 'participant-token') {
          req.user = {
            sub: 'participant-id',
            email: 'participant@example.com',
          };
        }

        if (token === 'stranger-token') {
          req.user = {
            sub: 'stranger-id',
            email: 'stranger@example.com',
          };
        }

        next();
      },
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /events/:id returns 403 for private event without authentication', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'private-event-id',
      visibility: EventVisibility.PRIVATE,
      organizerId: 'organizer-id',
      participants: [],
    });

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer).get('/events/private-event-id').expect(403);
  });

  it('GET /events/:id returns 200 for public event without authentication', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'public-event-id',
      title: 'Public Event',
      eventDate: new Date('2026-07-10T12:00:00.000Z'),
      visibility: EventVisibility.PUBLIC,
      organizerId: 'organizer-id',
      participants: [],
      organizer: { id: 'organizer-id' },
    });

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .get('/events/public-event-id')
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({ id: 'public-event-id' });
      });
  });

  it('GET /events/:id returns 200 for private event organizer', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'private-event-id',
      title: 'Private Event',
      eventDate: new Date('2026-07-10T12:00:00.000Z'),
      visibility: EventVisibility.PRIVATE,
      organizerId: 'organizer-id',
      participants: [],
      organizer: { id: 'organizer-id' },
    });

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .get('/events/private-event-id')
      .set('Authorization', 'Bearer organizer-token')
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({ id: 'private-event-id' });
      });
  });

  it('GET /events/:id returns 200 for private event participant', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'private-event-id',
      title: 'Private Event',
      eventDate: new Date('2026-07-10T12:00:00.000Z'),
      visibility: EventVisibility.PRIVATE,
      organizerId: 'organizer-id',
      participants: [{ userId: 'participant-id' }],
      organizer: { id: 'organizer-id' },
    });

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .get('/events/private-event-id')
      .set('Authorization', 'Bearer participant-token')
      .expect(200)
      .expect((response: Response) => {
        expect(response.body).toMatchObject({ id: 'private-event-id' });
      });
  });

  it('GET /events/:id returns 403 for private event authenticated non-member', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'private-event-id',
      title: 'Private Event',
      eventDate: new Date('2026-07-10T12:00:00.000Z'),
      visibility: EventVisibility.PRIVATE,
      organizerId: 'organizer-id',
      participants: [{ userId: 'participant-id' }],
      organizer: { id: 'organizer-id' },
    });

    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .get('/events/private-event-id')
      .set('Authorization', 'Bearer stranger-token')
      .expect(403);
  });
});
