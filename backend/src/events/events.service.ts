import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Event, EventVisibility } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Participant } from '../participants/entities/participant.entity';
import { Tag } from '../tags/entities/tag.entity';
import {
  assertPrivateEventAccess,
  AuthenticatedUser,
  buildFindOneRelations,
  mergeAndSortCalendarEvents,
  sanitizeParticipantEmails,
} from './events.service.helpers';
import {
  assertCapacityAvailable,
  assertEventFound,
  assertNotJoinedYet,
  assertUserCanJoinEvent,
} from './events-participation.helpers';
import { resolveEventTags } from './events-tags.helpers';
import {
  parseAndValidateEventDate,
  parseTagsFilter,
} from './events-validation.helpers';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async findAll(tagsFilter?: string): Promise<Event[]> {
    const normalizedTagFilters = parseTagsFilter(tagsFilter);

    if (normalizedTagFilters.length > 0) {
      return this.eventsRepository.find({
        where: {
          visibility: EventVisibility.PUBLIC,
          tags: {
            name: In(normalizedTagFilters),
          },
        },
        order: { eventDate: 'ASC' },
        relations: { organizer: true, participants: true, tags: true },
      });
    }

    return this.eventsRepository.find({
      where: { visibility: EventVisibility.PUBLIC },
      order: { eventDate: 'ASC' },
      relations: { organizer: true, participants: true, tags: true },
    });
  }

  async getCalendarForUser(userId: string): Promise<Event[]> {
    const [organizedEvents, participantRows] = await Promise.all([
      this.eventsRepository.find({
        where: { organizerId: userId },
        relations: { organizer: true, tags: true },
      }),
      this.participantsRepository.find({
        where: { userId },
        relations: { event: { organizer: true, tags: true } },
      }),
    ]);

    return mergeAndSortCalendarEvents(organizedEvents, participantRows);
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<Event> {
    const relations = buildFindOneRelations(user);

    const event = await this.eventsRepository.findOne({
      where: { id },
      relations,
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    assertPrivateEventAccess(event, user);

    return user ? sanitizeParticipantEmails(event) : event;
  }

  async create(
    createEventDto: CreateEventDto,
    user: AuthenticatedUser,
  ): Promise<Event> {
    const eventDate = parseAndValidateEventDate(createEventDto.eventDate);
    const tags = await resolveEventTags(
      this.tagsRepository,
      createEventDto.tags,
    );

    const event = this.eventsRepository.create({
      title: createEventDto.title,
      description: createEventDto.description,
      eventDate,
      location: createEventDto.location,
      capacity: createEventDto.capacity ?? null,
      visibility: createEventDto.visibility ?? EventVisibility.PUBLIC,
      organizerId: user.sub,
      tags,
    });

    return this.eventsRepository.save(event);
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    user: AuthenticatedUser,
  ): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== user.sub) {
      throw new ForbiddenException('Only organizer can update this event');
    }

    if (updateEventDto.title !== undefined) {
      event.title = updateEventDto.title;
    }

    if (updateEventDto.description !== undefined) {
      event.description = updateEventDto.description;
    }

    if (updateEventDto.location !== undefined) {
      event.location = updateEventDto.location;
    }

    if (updateEventDto.capacity !== undefined) {
      event.capacity = updateEventDto.capacity ?? null;
    }

    if (updateEventDto.visibility !== undefined) {
      event.visibility = updateEventDto.visibility;
    }

    if (updateEventDto.eventDate !== undefined) {
      event.eventDate = parseAndValidateEventDate(updateEventDto.eventDate);
    }

    if (updateEventDto.tags !== undefined) {
      event.tags = await resolveEventTags(
        this.tagsRepository,
        updateEventDto.tags,
      );
    }

    return this.eventsRepository.save(event);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== user.sub) {
      throw new ForbiddenException('Only organizer can delete this event');
    }

    await this.eventsRepository.delete({ id });
  }

  async joinEvent(id: string, user: AuthenticatedUser): Promise<void> {
    await this.eventsRepository.manager.transaction(async (manager) => {
      const transactionalEventsRepository = manager.getRepository(Event);
      const transactionalParticipantsRepository =
        manager.getRepository(Participant);

      const event = await transactionalEventsRepository
        .createQueryBuilder('event')
        .setLock('pessimistic_write')
        .where('event.id = :id', { id })
        .getOne();

      const existingEvent = assertEventFound(event);
      assertUserCanJoinEvent(existingEvent, user.sub);

      const existingParticipant =
        await transactionalParticipantsRepository.findOne({
          where: {
            eventId: id,
            userId: user.sub,
          },
        });

      assertNotJoinedYet(Boolean(existingParticipant));

      const participantCount = await transactionalParticipantsRepository.count({
        where: { eventId: id },
      });
      assertCapacityAvailable(existingEvent, participantCount);

      const participant = transactionalParticipantsRepository.create({
        eventId: id,
        userId: user.sub,
      });

      await transactionalParticipantsRepository.save(participant);
    });
  }

  async leaveEvent(id: string, user: AuthenticatedUser): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: {
        eventId: id,
        userId: user.sub,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participation not found');
    }

    await this.participantsRepository.delete({ id: participant.id });
  }
}
