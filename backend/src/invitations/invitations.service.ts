import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Event, EventVisibility } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../common/types/authenticated-request';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { EventInvitation } from './entities/event-invitation.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(EventInvitation)
    private readonly invitationsRepository: Repository<EventInvitation>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async createInvitation(
    eventId: string,
    dto: CreateInvitationDto,
    user: AuthenticatedUser,
  ): Promise<EventInvitation> {
    await this.assertOrganizerCanManageInvitations(eventId, user.sub);

    if (dto.invitedUserId === user.sub) {
      throw new BadRequestException('Organizer cannot invite themselves');
    }

    const invitedUser = await this.usersRepository.findOne({
      where: { id: dto.invitedUserId },
    });

    if (!invitedUser) {
      throw new NotFoundException('Invited user not found');
    }

    const existingParticipant = await this.participantsRepository.findOne({
      where: { eventId, userId: dto.invitedUserId },
    });

    if (existingParticipant) {
      throw new ConflictException(
        'User is already a participant of this event',
      );
    }

    const existingInvitation = await this.invitationsRepository.findOne({
      where: {
        eventId,
        invitedUserId: dto.invitedUserId,
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already exists for this user');
    }

    const invitation = this.invitationsRepository.create({
      eventId,
      invitedByUserId: user.sub,
      invitedUserId: dto.invitedUserId,
    });

    try {
      return await this.invitationsRepository.save(invitation);
    } catch (error: unknown) {
      if (this.isUniqueViolationError(error)) {
        throw new ConflictException('Invitation already exists for this user');
      }

      throw error;
    }
  }

  async listInvitationsForEvent(
    eventId: string,
    user: AuthenticatedUser,
  ): Promise<EventInvitation[]> {
    await this.assertOrganizerCanManageInvitations(eventId, user.sub);

    return this.invitationsRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      relations: {
        invitedByUser: true,
        invitedUser: true,
      },
    });
  }

  async revokeInvitation(
    eventId: string,
    invitationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.assertOrganizerCanManageInvitations(eventId, user.sub);

    const invitation = await this.invitationsRepository.findOne({
      where: {
        id: invitationId,
        eventId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.invitationsRepository.delete({
      id: invitation.id,
      eventId,
    });
  }

  private async assertOrganizerCanManageInvitations(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can manage invitations');
    }

    if (event.visibility !== EventVisibility.PRIVATE) {
      throw new BadRequestException(
        'Invitations are available only for private events',
      );
    }
  }

  private isUniqueViolationError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}
