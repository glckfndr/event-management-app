import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantLlmService } from './assistant-llm.service';
import { AssistantDataService } from './assistant-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant])],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantLlmService, AssistantDataService],
})
export class AssistantModule {}
