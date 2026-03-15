import { Injectable, Logger } from '@nestjs/common';

export const ASSISTANT_FALLBACK_MESSAGE =
  'Sorry, I didn’t understand that. Please try rephrasing your question.';

type AssistantContextEvent = {
  title: string;
  eventDate: string;
  visibility: 'public' | 'private';
  relationToUser: 'organizer' | 'participant' | 'unrelated';
  location?: string | null;
  tags: string[];
  participantCount: number;
  participantIds?: string[];
};

export type AssistantContextSnapshot = {
  currentUserId: string;
  generatedAt: string;
  dateWindow: {
    earliestEventDate: string | null;
    latestEventDate: string | null;
  };
  eventCount: number;
  tags: string[];
  events: AssistantContextEvent[];
};

type LlmChoice = {
  message?: {
    content?: string;
  };
};

type LlmResponse = {
  choices?: LlmChoice[];
};

export type AssistantIntentName =
  | 'count_total'
  | 'list_upcoming'
  | 'list_on_date'
  | 'list_in_range'
  | 'list_previous_week'
  | 'list_by_tag'
  | 'show_participants'
  | 'next_event'
  | 'where_is_event'
  | 'list_organized'
  | 'list_attending_this_week'
  | 'fallback';

export type AssistantQuestionIntent = {
  intent: AssistantIntentName;
  date?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
  eventTitle?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};

@Injectable()
export class AssistantLlmService {
  private readonly logger = new Logger(AssistantLlmService.name);

  async classifyQuestion(
    question: string,
    snapshot: AssistantContextSnapshot,
  ): Promise<AssistantQuestionIntent | null> {
    const apiKey = process.env.AI_API_KEY?.trim();

    if (!apiKey) {
      return null;
    }

    const provider = (process.env.AI_PROVIDER ?? 'groq').trim().toLowerCase();
    const baseUrl = this.resolveBaseUrl(provider);
    const model =
      process.env.AI_MODEL?.trim() ??
      (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const payload = {
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You classify event assistant questions into JSON intent only. Return strict JSON with shape: {"intent": string, "date"?: "YYYY-MM-DD", "startDate"?: "YYYY-MM-DD", "endDate"?: "YYYY-MM-DD", "tag"?: string, "eventTitle"?: string, "visibility"?: "public"|"private", "timeRange"?: "this_weekend"|"this_week"}. Allowed intents: count_total, list_upcoming, list_on_date, list_in_range, list_previous_week, list_by_tag, show_participants, next_event, where_is_event, list_organized, list_attending_this_week, fallback. Use fallback when unsupported/unclear.',
        },
        {
          role: 'user',
          content: `Question: ${question}\nContext: ${JSON.stringify(snapshot)}`,
        },
      ],
    };

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        this.logger.warn(`LLM request failed with status ${response.status}`);
        return null;
      }

      const data = (await response.json()) as LlmResponse;
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return null;
      }

      return this.parseIntent(content);
    } catch (error) {
      const errorStack =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(
        'LLM request failed, using fallback intent',
        errorStack,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveBaseUrl(provider: string): string {
    if (process.env.AI_BASE_URL?.trim()) {
      return process.env.AI_BASE_URL.trim().replace(/\/$/, '');
    }

    if (provider === 'groq') {
      return 'https://api.groq.com/openai/v1';
    }

    return 'https://api.openai.com/v1';
  }

  private parseIntent(value: string): AssistantQuestionIntent | null {
    try {
      const maybeJson = value.replace(/^```json\s*|```$/g, '').trim();
      const parsed = JSON.parse(maybeJson) as Partial<AssistantQuestionIntent>;

      if (!parsed.intent || !this.isAllowedIntent(parsed.intent)) {
        return null;
      }

      return {
        intent: parsed.intent,
        date: parsed.date,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        tag: parsed.tag,
        eventTitle: parsed.eventTitle,
        visibility:
          parsed.visibility === 'public' || parsed.visibility === 'private'
            ? parsed.visibility
            : undefined,
        timeRange:
          parsed.timeRange === 'this_week' ||
          parsed.timeRange === 'this_weekend'
            ? parsed.timeRange
            : undefined,
      };
    } catch {
      return null;
    }
  }

  private isAllowedIntent(intent: string): intent is AssistantIntentName {
    return [
      'count_total',
      'list_upcoming',
      'list_on_date',
      'list_in_range',
      'list_previous_week',
      'list_by_tag',
      'show_participants',
      'next_event',
      'where_is_event',
      'list_organized',
      'list_attending_this_week',
      'fallback',
    ].includes(intent);
  }
}
