<<<<<<< HEAD
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { EventsService } from '../events/events.service';
=======
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
>>>>>>> origin/main

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
<<<<<<< HEAD
    @Inject(EventsService)
    private readonly eventsService: {
      getCalendarForUser(userId: string): Promise<Event[]>;
    },
=======
>>>>>>> origin/main
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
<<<<<<< HEAD

  getMyEvents(userId: string): Promise<Event[]> {
    return this.eventsService.getCalendarForUser(userId);
  }
=======
>>>>>>> origin/main
}
