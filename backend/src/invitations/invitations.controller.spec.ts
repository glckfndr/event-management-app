import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationsService: {
    createInvitation: jest.Mock;
    listInvitationsForEvent: jest.Mock;
    revokeInvitation: jest.Mock;
  };

  beforeEach(async () => {
    invitationsService = {
      createInvitation: jest.fn(),
      listInvitationsForEvent: jest.fn(),
      revokeInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: invitationsService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createInvitation delegates to service with eventId, dto and current user', async () => {
    const user = { sub: 'organizer-id', email: 'organizer@example.com' };
    const dto = { invitedUserId: 'invitee-id' };
    const createdInvitation = {
      id: 'invitation-id',
      eventId: 'event-id',
      invitedByUserId: user.sub,
      invitedUserId: dto.invitedUserId,
    };

    invitationsService.createInvitation.mockResolvedValue(createdInvitation);

    const result = await controller.createInvitation('event-id', dto, user);

    expect(invitationsService.createInvitation).toHaveBeenCalledWith(
      'event-id',
      dto,
      user,
    );
    expect(result).toEqual(createdInvitation);
  });

  it('listInvitations delegates to service with eventId and current user', async () => {
    const user = { sub: 'organizer-id', email: 'organizer@example.com' };
    const invitations = [
      {
        id: 'invitation-id',
        eventId: 'event-id',
        invitedByUserId: user.sub,
        invitedUserId: 'invitee-id',
      },
    ];

    invitationsService.listInvitationsForEvent.mockResolvedValue(invitations);

    const result = await controller.listInvitations('event-id', user);

    expect(invitationsService.listInvitationsForEvent).toHaveBeenCalledWith(
      'event-id',
      user,
    );
    expect(result).toEqual(invitations);
  });

  it('revokeInvitation delegates to service with eventId, invitationId and current user', async () => {
    const user = { sub: 'organizer-id', email: 'organizer@example.com' };
    invitationsService.revokeInvitation.mockResolvedValue(undefined);

    await controller.revokeInvitation('event-id', 'invitation-id', user);

    expect(invitationsService.revokeInvitation).toHaveBeenCalledWith(
      'event-id',
      'invitation-id',
      user,
    );
  });
});
