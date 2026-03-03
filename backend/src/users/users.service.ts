import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
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
}
