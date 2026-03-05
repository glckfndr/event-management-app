import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventVisibility } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Participant } from '../participants/entities/participant.entity';

type AuthenticatedUser = {
  sub: string;
  email: string;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
  ) {}

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({
      where: { visibility: EventVisibility.PUBLIC },
      order: { eventDate: 'ASC' },
      relations: { organizer: true, participants: true },
    });
  }

  async getCalendarForUser(userId: string): Promise<Event[]> {
    const [organizedEvents, participantRows] = await Promise.all([
      this.eventsRepository.find({
        where: { organizerId: userId },
        relations: { organizer: true },
      }),
      this.participantsRepository.find({
        where: { userId },
        relations: { event: { organizer: true } },
      }),
    ]);

    const joinedEvents = participantRows
      .map((participant) => participant.event)
      .filter((event): event is Event => Boolean(event));

    const eventsById = new Map<string, Event>();

    for (const event of [...organizedEvents, ...joinedEvents]) {
      eventsById.set(event.id, event);
    }

    return [...eventsById.values()].sort(
      (first, second) =>
        new Date(first.eventDate).getTime() -
        new Date(second.eventDate).getTime(),
    );
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { organizer: true, participants: { user: true } },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.visibility === EventVisibility.PRIVATE) {
      if (!user) {
        throw new ForbiddenException(
          'Authentication is required to access private events',
        );
      }

      const isOrganizer = event.organizerId === user.sub;
      const isParticipant = event.participants.some(
        (participant) => participant.userId === user.sub,
      );

      if (!isOrganizer && !isParticipant) {
        throw new ForbiddenException(
          'You do not have access to this private event',
        );
      }
    }

    return event;
  }

  async create(
    createEventDto: CreateEventDto,
    user: AuthenticatedUser,
  ): Promise<Event> {
    const eventDate = this.parseAndValidateEventDate(createEventDto.eventDate);

    const event = this.eventsRepository.create({
      title: createEventDto.title,
      description: createEventDto.description,
      eventDate,
      location: createEventDto.location,
      capacity: createEventDto.capacity ?? null,
      visibility: createEventDto.visibility ?? EventVisibility.PUBLIC,
      organizerId: user.sub,
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
}
