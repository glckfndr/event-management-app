import { Injectable, Logger } from '@nestjs/common';

export const ASSISTANT_FALLBACK_MESSAGE =
  'Sorry, I didn’t understand that. Please try rephrasing your question.';

type AssistantContextEvent = {
  title: string;
  eventDate: string;
  visibility: 'public' | 'private';
  tags: string[];
  participantCount: number;
  participantIds?: string[];
};

export type AssistantContextSnapshot = {
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

@Injectable()
export class AssistantLlmService {
  private readonly logger = new Logger(AssistantLlmService.name);

  async askQuestion(
    question: string,
    snapshot: AssistantContextSnapshot,
  ): Promise<string | null> {
    const apiKey = process.env.AI_API_KEY?.trim();

    if (!apiKey) {
      return null;
    }

    const provider = (process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase();
    const baseUrl = this.resolveBaseUrl(provider);
    const model =
      process.env.AI_MODEL?.trim() ??
      (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const payload = {
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are an event assistant. Answer only with concise read-only information from provided context. If the question is unclear or unsupported, reply exactly with: ' +
            ASSISTANT_FALLBACK_MESSAGE,
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
      const answer = data.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        return null;
      }

      return answer.slice(0, 700);
    } catch (error) {
      this.logger.warn(
        'LLM request failed, using local fallback parser',
        error,
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
}
