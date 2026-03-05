import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';
<<<<<<< HEAD
import { Participant } from '../participants/entities/participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant])],
=======

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
>>>>>>> origin/main
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
