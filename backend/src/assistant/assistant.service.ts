import { Injectable, Logger } from '@nestjs/common';
import { answerFromIntent, answerFromRules } from './assistant-answer.helpers';
import {
  AssistantLlmService,
  ASSISTANT_FALLBACK_MESSAGE,
} from './assistant-llm.service';
import { isParticipantsQuestionText } from './assistant-text.helpers';
import type { AssistantQuestionIntent } from './assistant.types';
import { AssistantDataService } from './assistant-data.service';
import { AssistantScopeResolver } from './assistant-scope.resolver';
import { AssistantFallbackResolver } from './assistant-fallback.resolver';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly assistantLlmService: AssistantLlmService,
    private readonly assistantDataService: AssistantDataService,
    private readonly assistantScopeResolver: AssistantScopeResolver,
    private readonly assistantFallbackResolver: AssistantFallbackResolver,
  ) {}

  async answerQuestion(
    question: string,
    userId: string,
  ): Promise<{ answer: string }> {
    const normalizedQuestion = question.trim();
    const userEvents = await this.assistantDataService.loadUserEvents(userId);
    const scopedEvents = await this.assistantScopeResolver.resolveContextEvents(
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
      const fallbackEvents =
        await this.assistantScopeResolver.resolveLookupEventsForQuestion(
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

    const intentEvents = await this.assistantScopeResolver.resolveIntentEvents(
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
    events: Parameters<AssistantFallbackResolver['resolve']>[1],
    now: Date,
    terminalFallbackLogMessage: string,
  ): { answer: string } {
    const fallbackResolution = this.assistantFallbackResolver.resolve(
      question,
      events,
      now,
    );

    if (fallbackResolution.answer) {
      this.trace(`Assistant response source: ${fallbackResolution.source}`);
      return { answer: fallbackResolution.answer };
    }

    this.trace(`Assistant response source: ${terminalFallbackLogMessage}`);
    return { answer: ASSISTANT_FALLBACK_MESSAGE };
  }

  private trace(message: string): void {
    if (process.env.ASSISTANT_TRACE_LOGS?.trim().toLowerCase() !== 'true') {
      return;
    }

    this.logger.debug(message);
  }
}
