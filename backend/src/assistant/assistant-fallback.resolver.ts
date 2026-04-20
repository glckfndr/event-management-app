import { Injectable } from '@nestjs/common';
import {
  answerFromRules,
  answerParticipantsFromQuestion,
  answerWhereIsFromQuestion,
} from './assistant-answer.helpers';
import { shouldUseDateFallbackQuestion } from './assistant-text.helpers';
import type { AssistantEvent } from './assistant.types';

export type AssistantFallbackSource =
  | 'heuristic-participants'
  | 'heuristic-where-is'
  | 'local-rules-fallback'
  | 'heuristic-fallback';

export type AssistantFallbackResolution = {
  source: AssistantFallbackSource;
  answer: string | null;
};

@Injectable()
export class AssistantFallbackResolver {
  resolve(
    question: string,
    events: AssistantEvent[],
    now: Date,
  ): AssistantFallbackResolution {
    // Single transparent fallback path: participants -> where-is -> date rules.
    const participantsAnswer = answerParticipantsFromQuestion(question, events);

    if (participantsAnswer) {
      return {
        source: 'heuristic-participants',
        answer: participantsAnswer,
      };
    }

    const locationAnswer = answerWhereIsFromQuestion(question, events);

    if (locationAnswer) {
      return {
        source: 'heuristic-where-is',
        answer: locationAnswer,
      };
    }

    if (shouldUseDateFallbackQuestion(question)) {
      const localFallbackAnswer = answerFromRules(question, events, now);

      if (localFallbackAnswer) {
        return {
          source: 'local-rules-fallback',
          answer: localFallbackAnswer,
        };
      }
    }

    return {
      source: 'heuristic-fallback',
      answer: null,
    };
  }
}
