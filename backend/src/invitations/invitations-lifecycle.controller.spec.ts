import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsLifecycleController } from './invitations-lifecycle.controller';
import { InvitationsService } from './invitations.service';

describe('InvitationsLifecycleController', () => {
  let controller: InvitationsLifecycleController;
  let invitationsService: {
    listMyInvitations: jest.Mock;
    acceptInvitation: jest.Mock;
    declineInvitation: jest.Mock;
  };

  beforeEach(async () => {
    invitationsService = {
      listMyInvitations: jest.fn(),
      acceptInvitation: jest.fn(),
      declineInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsLifecycleController],
      providers: [
        {
          provide: InvitationsService,
          useValue: invitationsService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsLifecycleController>(
      InvitationsLifecycleController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listMyInvitations delegates to service with current user', async () => {
    const user = { sub: 'invitee-id', email: 'invitee@example.com' };
    const invitations = [{ id: 'invitation-id' }];

    invitationsService.listMyInvitations.mockResolvedValue(invitations);

    const result = await controller.listMyInvitations(user);

    expect(invitationsService.listMyInvitations).toHaveBeenCalledWith(user);
    expect(result).toEqual(invitations);
  });

  it('acceptInvitation delegates to service with invitation id and current user', async () => {
    const user = { sub: 'invitee-id', email: 'invitee@example.com' };

    invitationsService.acceptInvitation.mockResolvedValue({
      id: 'invitation-id',
      status: 'accepted',
    });

    const result = await controller.acceptInvitation('invitation-id', user);

    expect(invitationsService.acceptInvitation).toHaveBeenCalledWith(
      'invitation-id',
      user,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'invitation-id',
        status: 'accepted',
      }),
    );
  });

  it('declineInvitation delegates to service with invitation id and current user', async () => {
    const user = { sub: 'invitee-id', email: 'invitee@example.com' };

    invitationsService.declineInvitation.mockResolvedValue({
      id: 'invitation-id',
      status: 'declined',
    });

    const result = await controller.declineInvitation('invitation-id', user);

    expect(invitationsService.declineInvitation).toHaveBeenCalledWith(
      'invitation-id',
      user,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'invitation-id',
        status: 'declined',
      }),
    );
  });
});
