import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
<<<<<<< HEAD
import { UsersController } from './users.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), EventsModule],
  controllers: [UsersController],
=======

@Module({
  imports: [TypeOrmModule.forFeature([User])],
>>>>>>> origin/main
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
