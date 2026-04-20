import { Injectable } from '@nestjs/common';
import {
  isParticipantsQuestionText,
  isWhereIsQuestionText,
  shouldUseGlobalDateScopeQuestion,
} from './assistant-text.helpers';
import { AssistantDataService } from './assistant-data.service';
import type {
  AssistantEvent,
  AssistantQuestionIntent,
} from './assistant.types';

@Injectable()
export class AssistantScopeResolver {
  constructor(private readonly assistantDataService: AssistantDataService) {}

  async resolveContextEvents(
    question: string,
    userEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    if (!shouldUseGlobalDateScopeQuestion(question)) {
      return userEvents;
    }

    return this.assistantDataService.loadPublicLookupEvents(userEvents);
  }

  async resolveIntentEvents(
    intent: AssistantQuestionIntent,
    question: string,
    userEvents: AssistantEvent[],
    contextEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    if (
      intent.intent === 'where_is_event' ||
      intent.intent === 'show_participants'
    ) {
      return this.assistantDataService.loadPublicLookupEvents(userEvents);
    }

    return this.resolveLookupEventsForQuestion(question, contextEvents);
  }

  async resolveLookupEventsForQuestion(
    question: string,
    contextEvents: AssistantEvent[],
  ): Promise<AssistantEvent[]> {
    const shouldUseGlobalLookup =
      isWhereIsQuestionText(question) || isParticipantsQuestionText(question);

    if (!shouldUseGlobalLookup) {
      return contextEvents;
    }

    return this.assistantDataService.loadPublicLookupEvents(contextEvents);
  }
}
