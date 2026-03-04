import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
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
      order: { eventDate: 'ASC' },
      relations: { organizer: true },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { organizer: true, participants: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
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
      event.capacity = updateEventDto.capacity;
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
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const existingParticipant = await this.participantsRepository.findOne({
      where: {
        eventId: id,
        userId: user.sub,
      },
    });

    if (existingParticipant) {
      throw new ConflictException('User already joined this event');
    }

    if (event.capacity !== null && event.capacity !== undefined) {
      const participantCount = await this.participantsRepository.count({
        where: { eventId: id },
      });

      if (participantCount >= event.capacity) {
        throw new ConflictException('Event capacity reached');
      }
    }

    const participant = this.participantsRepository.create({
      eventId: id,
      userId: user.sub,
    });

    await this.participantsRepository.save(participant);
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
      throw new ForbiddenException('Event date is invalid');
    }

    if (parsedDate.getTime() <= Date.now()) {
      throw new ForbiddenException('Event date cannot be in the past');
    }

    return parsedDate;
  }
}
