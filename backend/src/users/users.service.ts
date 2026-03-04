import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async createUser(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      email: input.email,
      password: input.password,
      name: input.name,
    });

    return this.usersRepository.save(user);
  }

  async getMyEvents(userId: string): Promise<Event[]> {
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
}
