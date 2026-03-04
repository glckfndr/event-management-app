import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant])],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
