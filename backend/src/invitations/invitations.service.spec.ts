import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { Event, EventVisibility } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { User } from '../users/entities/user.entity';
import {
  EventInvitation,
  EventInvitationStatus,
} from './entities/event-invitation.entity';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let transactionManager: {
    getRepository: jest.Mock;
  };

  const invitationsRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const eventsRepository = {
    findOne: jest.fn(),
  };

  const participantsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const usersRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    transactionManager = {
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

    invitationsRepository.manager.transaction.mockImplementation(
      (
        callback: (
          manager: typeof transactionManager,
        ) => Promise<unknown> | unknown,
      ) => Promise.resolve(callback(transactionManager)),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getRepositoryToken(EventInvitation),
          useValue: invitationsRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates invitation for private event organizer', async () => {
    const organizer = { sub: 'organizer-id', email: 'organizer@example.com' };

    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: organizer.sub,
      visibility: EventVisibility.PRIVATE,
    });

    usersRepository.findOne.mockResolvedValue({
      id: 'invitee-id',
      email: 'invitee@example.com',
    });

    participantsRepository.findOne.mockResolvedValue(null);
    invitationsRepository.findOne.mockResolvedValue(null);

    const invitationPayload = {
      eventId: 'event-id',
      invitedByUserId: organizer.sub,
      invitedUserId: 'invitee-id',
    };

    invitationsRepository.create.mockReturnValue(invitationPayload);
    invitationsRepository.save.mockResolvedValue({
      id: 'invitation-id',
      ...invitationPayload,
    });

    const result = await service.createInvitation(
      'event-id',
      { invitedUserId: 'invitee-id' },
      organizer,
    );

    expect(invitationsRepository.create).toHaveBeenCalledWith(
      invitationPayload,
    );
    expect(result.id).toBe('invitation-id');
  });

  it('rejects creating invitation for public events', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PUBLIC,
    });

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'invitee-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects creating invitation for non-organizer with 403', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'owner-id',
      visibility: EventVisibility.PRIVATE,
    });

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'invitee-id' },
        { sub: 'another-user-id', email: 'user@example.com' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects self-invite with 400', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'organizer-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when invited user does not exist', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'missing-user-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 409 when invited user is already a participant', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    usersRepository.findOne.mockResolvedValue({
      id: 'invitee-id',
      email: 'invitee@example.com',
    });

    participantsRepository.findOne.mockResolvedValue({
      id: 'participant-id',
      eventId: 'event-id',
      userId: 'invitee-id',
    });

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'invitee-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(invitationsRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects duplicate invitation pair', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    usersRepository.findOne.mockResolvedValue({ id: 'invitee-id' });
    participantsRepository.findOne.mockResolvedValue(null);
    invitationsRepository.findOne.mockResolvedValue({
      id: 'existing-id',
      eventId: 'event-id',
      invitedUserId: 'invitee-id',
    });

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'invitee-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps unique violation on save to conflict for concurrent race', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    usersRepository.findOne.mockResolvedValue({ id: 'invitee-id' });
    participantsRepository.findOne.mockResolvedValue(null);
    invitationsRepository.findOne.mockResolvedValue(null);

    const invitationPayload = {
      eventId: 'event-id',
      invitedByUserId: 'organizer-id',
      invitedUserId: 'invitee-id',
    };

    const driverError = new Error('duplicate invitation') as Error & {
      code: string;
    };
    driverError.code = '23505';

    invitationsRepository.create.mockReturnValue(invitationPayload);
    invitationsRepository.save.mockRejectedValue(
      new QueryFailedError('insert into event_invitations', [], driverError),
    );

    await expect(
      service.createInvitation(
        'event-id',
        { invitedUserId: 'invitee-id' },
        { sub: 'organizer-id', email: 'organizer@example.com' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists invitations for private event organizer with expected ordering and relations', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    const invitations = [
      {
        id: 'invitation-2',
        eventId: 'event-id',
        invitedByUserId: 'organizer-id',
        invitedUserId: 'invitee-2',
      },
      {
        id: 'invitation-1',
        eventId: 'event-id',
        invitedByUserId: 'organizer-id',
        invitedUserId: 'invitee-1',
      },
    ];

    invitationsRepository.find.mockResolvedValue(invitations);

    const result = await service.listInvitationsForEvent('event-id', {
      sub: 'organizer-id',
      email: 'organizer@example.com',
    });

    expect(invitationsRepository.find).toHaveBeenCalledWith({
      where: { eventId: 'event-id' },
      order: { createdAt: 'DESC' },
      relations: {
        invitedByUser: true,
        invitedUser: true,
      },
    });
    expect(result).toEqual(invitations);
  });

  it('rejects listing invitations for non-organizer with 403', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'owner-id',
      visibility: EventVisibility.PRIVATE,
    });

    await expect(
      service.listInvitationsForEvent('event-id', {
        sub: 'another-user-id',
        email: 'user@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects listing invitations for public event with 400', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PUBLIC,
    });

    await expect(
      service.listInvitationsForEvent('event-id', {
        sub: 'organizer-id',
        email: 'organizer@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes invitation for organizer/private event', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    invitationsRepository.findOne.mockResolvedValue({
      id: 'invitation-id',
      eventId: 'event-id',
    });

    invitationsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.revokeInvitation('event-id', 'invitation-id', {
        sub: 'organizer-id',
        email: 'organizer@example.com',
      }),
    ).resolves.toBeUndefined();

    expect(invitationsRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'invitation-id',
        eventId: 'event-id',
      },
    });

    expect(invitationsRepository.delete).toHaveBeenCalledWith({
      id: 'invitation-id',
      eventId: 'event-id',
    });
  });

  it('throws when invitation to revoke is missing', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'event-id',
      organizerId: 'organizer-id',
      visibility: EventVisibility.PRIVATE,
    });

    invitationsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.revokeInvitation('event-id', 'missing-invitation-id', {
        sub: 'organizer-id',
        email: 'organizer@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listMyInvitations returns current user invitations with relations and ordering', async () => {
    const invitations = [{ id: 'invitation-id', invitedUserId: 'invitee-id' }];
    invitationsRepository.find.mockResolvedValue(invitations);

    const result = await service.listMyInvitations({
      sub: 'invitee-id',
      email: 'invitee@example.com',
    });

    expect(invitationsRepository.find).toHaveBeenCalledWith({
      where: { invitedUserId: 'invitee-id' },
      order: { createdAt: 'DESC' },
      relations: {
        event: { organizer: true, tags: true },
        invitedByUser: true,
      },
    });
    expect(result).toEqual(invitations);
  });

  it('acceptInvitation updates status and creates participant for pending invitation', async () => {
    const invitation = {
      id: 'invitation-id',
      eventId: 'event-id',
      invitedUserId: 'invitee-id',
      status: EventInvitationStatus.PENDING,
    };

    invitationsRepository.findOne.mockResolvedValue(invitation);
    invitationsRepository.save.mockResolvedValue({
      ...invitation,
      status: EventInvitationStatus.ACCEPTED,
    });
    participantsRepository.findOne.mockResolvedValue(null);
    participantsRepository.create.mockReturnValue({
      eventId: 'event-id',
      userId: 'invitee-id',
    });
    participantsRepository.save.mockResolvedValue({
      id: 'participant-id',
      eventId: 'event-id',
      userId: 'invitee-id',
    });

    const result = await service.acceptInvitation('invitation-id', {
      sub: 'invitee-id',
      email: 'invitee@example.com',
    });

    expect(invitationsRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'invitation-id',
        invitedUserId: 'invitee-id',
      },
    });
    expect(participantsRepository.create).toHaveBeenCalledWith({
      eventId: 'event-id',
      userId: 'invitee-id',
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: EventInvitationStatus.ACCEPTED,
      }),
    );
  });

  it('acceptInvitation rejects non-pending invitation', async () => {
    invitationsRepository.findOne.mockResolvedValue({
      id: 'invitation-id',
      eventId: 'event-id',
      invitedUserId: 'invitee-id',
      status: EventInvitationStatus.DECLINED,
    });

    await expect(
      service.acceptInvitation('invitation-id', {
        sub: 'invitee-id',
        email: 'invitee@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(participantsRepository.create).not.toHaveBeenCalled();
  });

  it('declineInvitation updates status for pending invitation', async () => {
    const invitation = {
      id: 'invitation-id',
      eventId: 'event-id',
      invitedUserId: 'invitee-id',
      status: EventInvitationStatus.PENDING,
    };

    invitationsRepository.findOne.mockResolvedValue(invitation);
    invitationsRepository.save.mockResolvedValue({
      ...invitation,
      status: EventInvitationStatus.DECLINED,
    });

    const result = await service.declineInvitation('invitation-id', {
      sub: 'invitee-id',
      email: 'invitee@example.com',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: EventInvitationStatus.DECLINED,
      }),
    );
  });
});
