import { AssistantLlmService } from './assistant-llm.service';

describe('AssistantLlmService', () => {
  const originalFetch = global.fetch;
  const snapshot = {
    currentUserId: 'user-1',
    generatedAt: '2026-03-12T10:00:00.000Z',
    dateWindow: {
      earliestEventDate: '2026-03-13T12:00:00.000Z',
      latestEventDate: '2026-03-20T18:00:00.000Z',
    },
    eventCount: 2,
    tags: ['tech', 'community'],
    events: [
      {
        title: 'Tech Meetup',
        eventDate: '2026-03-13T12:00:00.000Z',
        visibility: 'public' as const,
        relationToUser: 'organizer' as const,
        location: 'Kyiv',
        tags: ['tech'],
        participantCount: 2,
      },
    ],
  };

  beforeEach(() => {
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_PROVIDER = 'openai';
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
    jest.restoreAllMocks();
  });

  it('returns null when llm responds with malformed JSON content', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"intent":"list_upcoming"',
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await service.classifyQuestion(
      'List my upcoming events',
      snapshot,
    );

    expect(result).toBeNull();
  });

  it('returns null when llm responds with non-ok status', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }) as typeof fetch;

    const result = await service.classifyQuestion(
      'List my upcoming events',
      snapshot,
    );

    expect(result).toBeNull();
  });

  it('returns null when llm response content is empty', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '   ',
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await service.classifyQuestion(
      'List my upcoming events',
      snapshot,
    );

    expect(result).toBeNull();
  });

  it('returns null when llm responds with an unknown intent', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ intent: 'invent_new_intent' }),
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await service.classifyQuestion(
      'Invent a new schedule mode',
      snapshot,
    );

    expect(result).toBeNull();
  });

  it('parses valid fenced JSON intent responses', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content:
                '```json\n{"intent":"where_is_event","eventTitle":"Tech Meetup"}\n```',
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await service.classifyQuestion(
      'Where is Tech Meetup?',
      snapshot,
    );

    expect(result).toEqual({
      intent: 'where_is_event',
      eventTitle: 'Tech Meetup',
      date: undefined,
      startDate: undefined,
      endDate: undefined,
      tag: undefined,
      visibility: undefined,
      timeRange: undefined,
    });
  });

  it('returns null when fetch rejects with a network error', async () => {
    const service = new AssistantLlmService();

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network error')) as typeof fetch;

    const result = await service.classifyQuestion(
      'List my upcoming events',
      snapshot,
    );

    expect(result).toBeNull();
  });

  it('returns null when fetch is aborted by the 8-second timeout', async () => {
    jest.useFakeTimers();
    const service = new AssistantLlmService();

    global.fetch = jest.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            );
          });
        }),
    ) as typeof fetch;

    const resultPromise = service.classifyQuestion(
      'List my upcoming events',
      snapshot,
    );

    jest.advanceTimersByTime(8001);
    const result = await resultPromise;

    expect(result).toBeNull();
    jest.useRealTimers();
  });
});
