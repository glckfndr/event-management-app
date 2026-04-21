import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { EventsController } from '../src/events/events.controller';
import { Event, EventVisibility } from '../src/events/entities/event.entity';
import { EventsService } from '../src/events/events.service';
import { InvitationsLifecycleController } from '../src/invitations/invitations-lifecycle.controller';
import { InvitationsController } from '../src/invitations/invitations.controller';
import {
  EventInvitation,
  EventInvitationStatus,
} from '../src/invitations/entities/event-invitation.entity';
import { InvitationsService } from '../src/invitations/invitations.service';
import { Participant } from '../src/participants/entities/participant.entity';
import { Tag } from '../src/tags/entities/tag.entity';
import { User } from '../src/users/entities/user.entity';

type InvitationRecord = {
  id: string;
  eventId: string;
  invitedByUserId: string;
  invitedUserId: string;
  status: EventInvitationStatus;
  createdAt: Date;
};

describe('Invitations lifecycle (e2e)', () => {
  let app: INestApplication;

  const users = {
    organizer: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'organizer@example.com',
      name: 'Organizer',
    },
    invitee: {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'invitee@example.com',
      name: 'Invitee',
    },
    stranger: {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'stranger@example.com',
      name: 'Stranger',
    },
  };

  const privateEventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const invitationToAcceptId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const invitationToDeclineId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const invitations: InvitationRecord[] = [];
  const participants: Array<{ id: string; eventId: string; userId: string }> =
    [];

  const eventsRepository = {
    findOne: jest.fn(({ where }: { where: { id: string } }) => {
      if (where.id !== privateEventId) {
        return null;
      }

      return {
        id: privateEventId,
        title: 'Private party',
        visibility: EventVisibility.PRIVATE,
        organizerId: users.organizer.id,
        organizer: users.organizer,
        participants: participants.map((participant) => ({
          userId: participant.userId,
          user: Object.values(users).find(
            (user) => user.id === participant.userId,
          ),
        })),
        invitations: invitations.filter(
          (invitation) => invitation.eventId === privateEventId,
        ),
        tags: [],
        eventDate: new Date('2026-12-01T18:00:00.000Z'),
      };
    }),
    find: jest.fn(() => []),
    create: jest.fn((payload: Record<string, unknown>) => payload),
    save: jest.fn((payload: Record<string, unknown>) => payload),
    delete: jest.fn(() => ({ affected: 1 })),
    manager: {
      transaction: jest.fn(),
    },
  };

  const participantsRepository = {
    findOne: jest.fn(
      ({ where }: { where: { eventId: string; userId: string } }) =>
        participants.find(
          (participant) =>
            participant.eventId === where.eventId &&
            participant.userId === where.userId,
        ) ?? null,
    ),
    count: jest.fn(() => participants.length),
    create: jest.fn((payload: Record<string, unknown>) => payload),
    save: jest.fn((payload: { eventId: string; userId: string }) => {
      const existing = participants.find(
        (participant) =>
          participant.eventId === payload.eventId &&
          participant.userId === payload.userId,
      );

      if (existing) {
        return existing;
      }

      const row = {
        id: `participant-${participants.length + 1}`,
        eventId: payload.eventId,
        userId: payload.userId,
      };

      participants.push(row);
      return row;
    }),
    delete: jest.fn(() => ({ affected: 1 })),
  };

  const transactionManager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === EventInvitation) {
        return invitationsRepository;
      }

      if (entity === Participant) {
        return participantsRepository;
      }

      return undefined;
    }),
  };

  const invitationsRepository = {
    create: jest.fn((payload: Record<string, unknown>) => payload),
    find: jest.fn(
      ({ where }: { where: { eventId?: string; invitedUserId?: string } }) => {
        if (where.eventId) {
          return invitations.filter(
            (invitation) => invitation.eventId === where.eventId,
          );
        }

        if (where.invitedUserId) {
          return invitations.filter(
            (invitation) => invitation.invitedUserId === where.invitedUserId,
          );
        }

        return [];
      },
    ),
    findOne: jest.fn(
      ({
        where,
      }: {
        where: { id?: string; eventId?: string; invitedUserId?: string };
      }) =>
        invitations.find((invitation) => {
          const idMatches = where.id ? invitation.id === where.id : true;
          const eventMatches = where.eventId
            ? invitation.eventId === where.eventId
            : true;
          const userMatches = where.invitedUserId
            ? invitation.invitedUserId === where.invitedUserId
            : true;

          return idMatches && eventMatches && userMatches;
        }) ?? null,
    ),
    save: jest.fn((payload: InvitationRecord) => {
      const existingIndex = invitations.findIndex(
        (invitation) => invitation.id === payload.id,
      );

      if (existingIndex === -1) {
        const row: InvitationRecord = {
          ...payload,
          createdAt: payload.createdAt ?? new Date(),
        };
        invitations.push(row);
        return row;
      }

      invitations[existingIndex] = {
        ...invitations[existingIndex],
        ...payload,
      };

      return invitations[existingIndex];
    }),
    update: jest.fn(
      (
        where: {
          id: string;
          invitedUserId: string;
          status: EventInvitationStatus;
        },
        values: { status: EventInvitationStatus },
      ) => {
        const invitation = invitations.find(
          (row) =>
            row.id === where.id &&
            row.invitedUserId === where.invitedUserId &&
            row.status === where.status,
        );

        if (!invitation) {
          return { affected: 0 };
        }

        invitation.status = values.status;
        return { affected: 1 };
      },
    ),
    delete: jest.fn(({ id, eventId }: { id: string; eventId: string }) => {
      const index = invitations.findIndex(
        (invitation) => invitation.id === id && invitation.eventId === eventId,
      );

      if (index >= 0) {
        invitations.splice(index, 1);
      }

      return { affected: index >= 0 ? 1 : 0 };
    }),
    manager: {
      transaction: jest.fn(
        (
          callback: (
            manager: typeof transactionManager,
          ) => Promise<unknown> | unknown,
        ) => Promise.resolve(callback(transactionManager)),
      ),
    },
  };

  const usersRepository = {
    findOne: jest.fn(
      ({ where }: { where: { id: string } }) =>
        Object.values(users).find((user) => user.id === where.id) ?? null,
    ),
  };

  const tagsRepository = {
    find: jest.fn(() => []),
    create: jest.fn((payload: Record<string, unknown>) => payload),
    save: jest.fn((payload: Record<string, unknown>) => payload),
  };

  const authGuard: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const requestContext = context.switchToHttp().getRequest<{
        headers: Record<string, string | undefined>;
        user?: { sub: string; email: string };
      }>();

      const authorization = requestContext.headers.authorization;
      const token = authorization?.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined;

      if (token === 'organizer-token') {
        requestContext.user = {
          sub: users.organizer.id,
          email: users.organizer.email,
        };
        return true;
      }

      if (token === 'invitee-token') {
        requestContext.user = {
          sub: users.invitee.id,
          email: users.invitee.email,
        };
        return true;
      }

      if (token === 'stranger-token') {
        requestContext.user = {
          sub: users.stranger.id,
          email: users.stranger.email,
        };
        return true;
      }

      throw new UnauthorizedException();
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        EventsController,
        InvitationsController,
        InvitationsLifecycleController,
      ],
      providers: [
        EventsService,
        InvitationsService,
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantsRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: tagsRepository,
        },
        {
          provide: getRepositoryToken(EventInvitation),
          useValue: invitationsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

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
          req.user = {
            sub: users.organizer.id,
            email: users.organizer.email,
          };
        }

        if (token === 'invitee-token') {
          req.user = {
            sub: users.invitee.id,
            email: users.invitee.email,
          };
        }

        if (token === 'stranger-token') {
          req.user = {
            sub: users.stranger.id,
            email: users.stranger.email,
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
    invitations.length = 0;
    participants.length = 0;

    invitations.push(
      {
        id: invitationToAcceptId,
        eventId: privateEventId,
        invitedByUserId: users.organizer.id,
        invitedUserId: users.invitee.id,
        status: EventInvitationStatus.PENDING,
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
      },
      {
        id: invitationToDeclineId,
        eventId: privateEventId,
        invitedByUserId: users.organizer.id,
        invitedUserId: users.invitee.id,
        status: EventInvitationStatus.PENDING,
        createdAt: new Date('2026-10-01T11:00:00.000Z'),
      },
    );

    jest.clearAllMocks();
  });

  it('GET /invitations/me returns invitations for current user', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/invitations/me')
      .set('Authorization', 'Bearer invitee-token')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
  });

  it('POST /invitations/:id/accept grants private event access', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .get(`/events/${privateEventId}`)
      .set('Authorization', 'Bearer invitee-token')
      .expect(403);

    await request(httpServer)
      .post(`/invitations/${invitationToAcceptId}/accept`)
      .set('Authorization', 'Bearer invitee-token')
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            id: invitationToAcceptId,
            status: EventInvitationStatus.ACCEPTED,
          }),
        );
      });

    await request(httpServer)
      .get(`/events/${privateEventId}`)
      .set('Authorization', 'Bearer invitee-token')
      .expect(200);
  });

  it('POST /invitations/:id/decline sets declined status and keeps private access denied', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .post(`/invitations/${invitationToDeclineId}/decline`)
      .set('Authorization', 'Bearer invitee-token')
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            id: invitationToDeclineId,
            status: EventInvitationStatus.DECLINED,
          }),
        );
      });

    await request(httpServer)
      .get(`/events/${privateEventId}`)
      .set('Authorization', 'Bearer invitee-token')
      .expect(403);
  });
});
