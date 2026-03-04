import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Event, Participant])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
