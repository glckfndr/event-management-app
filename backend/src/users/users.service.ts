import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { EventsService } from '../events/events.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly eventsService: EventsService,
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

  getMyEvents(userId: string): Promise<Event[]> {
    return this.eventsService.getCalendarForUser(userId);
  }
}
