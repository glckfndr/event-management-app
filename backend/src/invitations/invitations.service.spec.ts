import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event, EventVisibility } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { User } from '../users/entities/user.entity';
import { EventInvitation } from './entities/event-invitation.entity';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const invitationsRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const eventsRepository = {
    findOne: jest.fn(),
  };

  const participantsRepository = {
    findOne: jest.fn(),
  };

  const usersRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
});
