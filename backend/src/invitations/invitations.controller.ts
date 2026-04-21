import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { EventInvitation } from './entities/event-invitation.entity';
import { InvitationsService } from './invitations.service';

@ApiTags('event invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Invite user to private event (organizer only)' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  createInvitation(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<EventInvitation> {
    return this.invitationsService.createInvitation(eventId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List private event invitations (organizer only)' })
  @ApiResponse({ status: 200, description: 'Invitations list' })
  listInvitations(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<EventInvitation[]> {
    return this.invitationsService.listInvitationsForEvent(eventId, user);
  }

  @Delete(':invitationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke invitation (organizer only)' })
  @ApiResponse({ status: 204, description: 'Invitation revoked successfully' })
  async revokeInvitation(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<void> {
    await this.invitationsService.revokeInvitation(eventId, invitationId, user);
  }
}
