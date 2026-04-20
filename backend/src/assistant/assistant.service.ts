import { Injectable, Logger } from '@nestjs/common';
import {
  answerFromIntent,
  answerFromRules,
  answerParticipantsFromQuestion,
  answerWhereIsFromQuestion,
} from './assistant-answer.helpers';
import {
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';
import {
  isParticipantsQuestionText,
  isWhereIsQuestionText,
  shouldUseDateFallbackQuestion,
  shouldUseGlobalDateScopeQuestion,
} from './assistant-text.helpers';
import type { AssistantQuestionIntent } from './assistant.types';
import { AssistantDataService } from './assistant-data.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly assistantLlmService: AssistantLlmService,
    private readonly assistantDataService: AssistantDataService,
  ) {}

  async answerQuestion(
    question: string,
    userId: string,
  ): Promise<{ answer: string }> {
    const normalizedQuestion = question.trim();
    const userEvents = await this.assistantDataService.loadUserEvents(userId);
    const scopedEvents = await this.resolveContextEvents(
      normalizedQuestion,
      userEvents,
    );
    const now = new Date();
    const shouldQueryLlm = Boolean(process.env.AI_API_KEY?.trim());

    this.trace(
      `Assistant request: llmEnabled=${shouldQueryLlm}, questionLength=${normalizedQuestion.length}`,
    );

    // Deterministic rules are the fallback path when AI is not configured.
    if (!shouldQueryLlm) {
      const localAnswer = answerFromRules(
        normalizedQuestion,
        scopedEvents,
        now,
      );

      if (localAnswer) {
        this.trace('Assistant response source: local-rules (no AI_API_KEY)');
        return { answer: localAnswer };
      }

      this.trace(
        'Assistant response source: fallback (no AI_API_KEY, no local match)',
      );
      return { answer: ASSISTANT_FALLBACK_MESSAGE };
    }

    const snapshot = this.assistantDataService.buildSnapshot(
      scopedEvents,
      now,
      userId,
      isParticipantsQuestionText(normalizedQuestion),
    );

    const intent = await this.classifyQuestion(normalizedQuestion, snapshot);

    // If the model cannot classify confidently, fall back to rule-based resolvers.
    if (!intent || intent.intent === 'fallback') {
      const fallbackEvents = await this.resolveLookupEvents(
        normalizedQuestion,
        scopedEvents,
      );

      return this.resolveFallbackResponse(
        normalizedQuestion,
        fallbackEvents,
        now,
        'fallback (llm unclear intent)',
      );
    }

    const intentEvents = await this.resolveIntentEvents(
      intent,
      normalizedQuestion,
      userEvents,
      scopedEvents,
    );

    const answer = answerFromIntent(
      intent,
      intentEvents,
      now,
      userId,
      normalizedQuestion,
    );

    if (!answer) {
      return this.resolveFallbackResponse(
        normalizedQuestion,
        intentEvents,
        now,
        'fallback (intent unsupported)',
      );
    }

    this.trace(`Assistant response source: llm-intent (${intent.intent})`);
    return { answer };
  }

  private async classifyQuestion(
    question: string,
    snapshot: Parameters<AssistantLlmService['classifyQuestion']>[1],
  ): Promise<AssistantQuestionIntent | null> {
    return this.assistantLlmService.classifyQuestion(question, snapshot);
  }

  private resolveFallbackResponse(
    question: string,
    events: Parameters<typeof answerFromRules>[1],
    now: Date,
    terminalFallbackLogMessage: string,
  ): { answer: string } {
    const participantsAnswer = answerParticipantsFromQuestion(question, events);

    if (participantsAnswer) {
      this.trace('Assistant response source: heuristic-participants');
      return { answer: participantsAnswer };
    }

    const locationAnswer = answerWhereIsFromQuestion(question, events);

    if (locationAnswer) {
      this.trace('Assistant response source: heuristic-where-is');
      return { answer: locationAnswer };
    }

    if (shouldUseDateFallbackQuestion(question)) {
      const localFallbackAnswer = answerFromRules(question, events, now);

      if (localFallbackAnswer) {
        this.trace('Assistant response source: local-rules-fallback');
        return { answer: localFallbackAnswer };
      }
    }

    this.trace(`Assistant response source: ${terminalFallbackLogMessage}`);
    return { answer: ASSISTANT_FALLBACK_MESSAGE };
  }

  private async resolveContextEvents(
    question: string,
    userEvents: Parameters<AssistantDataService['loadPublicLookupEvents']>[0],
  ) {
    if (!shouldUseGlobalDateScopeQuestion(question)) {
      return userEvents;
    }

    return this.assistantDataService.loadPublicLookupEvents(userEvents);
  }

  private async resolveLookupEvents(
    question: string,
    contextEvents: Parameters<
      AssistantDataService['loadPublicLookupEvents']
    >[0],
  ) {
    if (!this.isLookupQuestion(question)) {
      return contextEvents;
    }

    return this.assistantDataService.loadPublicLookupEvents(contextEvents);
  }

  private async resolveIntentEvents(
    intent: AssistantQuestionIntent,
    question: string,
    userEvents: Parameters<AssistantDataService['loadPublicLookupEvents']>[0],
    contextEvents: Parameters<
      AssistantDataService['loadPublicLookupEvents']
    >[0],
  ) {
    if (
      intent.intent === 'where_is_event' ||
      intent.intent === 'show_participants'
    ) {
      return this.assistantDataService.loadPublicLookupEvents(userEvents);
    }

    return this.resolveLookupEvents(question, contextEvents);
  }

  private isLookupQuestion(question: string): boolean {
    return (
      isWhereIsQuestionText(question) || isParticipantsQuestionText(question)
    );
  }

  private trace(message: string): void {
    if (process.env.ASSISTANT_TRACE_LOGS?.trim().toLowerCase() !== 'true') {
      return;
    }

    this.logger.debug(message);
  }
}
