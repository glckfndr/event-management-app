import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

type AuthenticatedUser = {
  sub: string;
  email: string;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
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
