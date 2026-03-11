import {
  BadRequestException,
  ConflictException,
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

@Injectable()
export class EventsService {
  private static readonly MAX_FILTER_TAGS = 5;

  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async findAll(tagsFilter?: string): Promise<Event[]> {
    const normalizedTagFilters = this.parseTagsFilter(tagsFilter);

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
    const eventDate = this.parseAndValidateEventDate(createEventDto.eventDate);
    const tags = await this.resolveTags(createEventDto.tags);

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
      event.eventDate = this.parseAndValidateEventDate(
        updateEventDto.eventDate,
      );
    }

    if (updateEventDto.tags !== undefined) {
      event.tags = await this.resolveTags(updateEventDto.tags);
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

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (event.organizerId === user.sub) {
        throw new ForbiddenException(
          'Organizer cannot join their own event as participant',
        );
      }

      const existingParticipant =
        await transactionalParticipantsRepository.findOne({
          where: {
            eventId: id,
            userId: user.sub,
          },
        });

      if (existingParticipant) {
        throw new ConflictException('User already joined this event');
      }

      if (event.capacity !== null && event.capacity !== undefined) {
        const participantCount =
          await transactionalParticipantsRepository.count({
            where: { eventId: id },
          });

        if (participantCount >= event.capacity) {
          throw new ConflictException('Event capacity reached');
        }
      }

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

  private parseAndValidateEventDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Event date is invalid');
    }

    if (parsedDate.getTime() <= Date.now()) {
      throw new BadRequestException('Event date cannot be in the past');
    }

    return parsedDate;
  }

  private parseTagsFilter(tagsFilter?: string): string[] {
    if (!tagsFilter?.trim()) {
      return [];
    }

    const normalizedTags = [
      ...new Set(
        tagsFilter
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (normalizedTags.length > EventsService.MAX_FILTER_TAGS) {
      throw new BadRequestException(
        `Maximum ${EventsService.MAX_FILTER_TAGS} filter tags are allowed`,
      );
    }

    return normalizedTags;
  }

  private async resolveTags(tags?: string[]): Promise<Tag[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const normalizedTags = [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
    ];

    if (normalizedTags.length === 0) {
      return [];
    }

    if (normalizedTags.length > 5) {
      throw new BadRequestException('Maximum 5 tags are allowed per event');
    }

    const existingTags = await this.tagsRepository.find({
      where: normalizedTags.map((name) => ({ name })),
    });

    const existingByName = new Map(existingTags.map((tag) => [tag.name, tag]));
    const missingNames = normalizedTags.filter(
      (name) => !existingByName.has(name),
    );

    if (missingNames.length === 0) {
      return normalizedTags
        .map((name) => existingByName.get(name))
        .filter((tag): tag is Tag => Boolean(tag));
    }

    let newTags: Tag[] = [];

    try {
      newTags = await this.tagsRepository.save(
        missingNames.map((name) => this.tagsRepository.create({ name })),
      );
    } catch {
      // Another request may have inserted the same normalized tag names.
      const refreshedTags = await this.tagsRepository.find({
        where: normalizedTags.map((name) => ({ name })),
      });

      const refreshedByName = new Map(
        refreshedTags.map((tag) => [tag.name, tag]),
      );

      return normalizedTags
        .map((name) => refreshedByName.get(name))
        .filter((tag): tag is Tag => Boolean(tag));
    }

    for (const tag of newTags) {
      existingByName.set(tag.name, tag);
    }

    return normalizedTags
      .map((name) => existingByName.get(name))
      .filter((tag): tag is Tag => Boolean(tag));
  }
}
