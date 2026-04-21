import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EventInvitation } from './entities/event-invitation.entity';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsLifecycleController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'List invitations for current user' })
  @ApiResponse({ status: 200, description: 'Current user invitations list' })
  listMyInvitations(
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<EventInvitation[]> {
    return this.invitationsService.listMyInvitations(user);
  }

  @Post(':invitationId/accept')
  @ApiOperation({ summary: 'Accept invitation for current user' })
  @ApiResponse({ status: 201, description: 'Invitation accepted' })
  acceptInvitation(
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<EventInvitation> {
    return this.invitationsService.acceptInvitation(invitationId, user);
  }

  @Post(':invitationId/decline')
  @ApiOperation({ summary: 'Decline invitation for current user' })
  @ApiResponse({ status: 201, description: 'Invitation declined' })
  declineInvitation(
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<EventInvitation> {
    return this.invitationsService.declineInvitation(invitationId, user);
  }
}
