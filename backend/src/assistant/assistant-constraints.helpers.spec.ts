import {
  applyQuestionConstraints,
  buildFilteredTitle,
  resolveQuestionConstraints,
} from './assistant-constraints.helpers';

type TestEvent = {
  id: string;
  eventDate: Date;
  visibility: 'public' | 'private';
  tags: string[];
};

describe('assistant-constraints.helpers', () => {
  const now = new Date('2026-03-12T10:00:00.000Z');

  const events: TestEvent[] = [
    {
      id: 'week-public-tech',
      eventDate: new Date('2026-03-14T10:00:00.000Z'),
      visibility: 'public',
      tags: ['tech'],
    },
    {
      id: 'week-private-tech',
      eventDate: new Date('2026-03-15T10:00:00.000Z'),
      visibility: 'private',
      tags: ['tech'],
    },
    {
      id: 'next-week-public-planning',
      eventDate: new Date('2026-03-25T10:00:00.000Z'),
      visibility: 'public',
      tags: ['planning'],
    },
  ];

  it('resolves constraints from question text when intent fields are missing', () => {
    const constraints = resolveQuestionConstraints(
      {},
      'show public events with tech tag this week',
      events,
    );

    expect(constraints).toEqual({
      tag: 'tech',
      visibility: 'public',
      timeRange: 'this_week',
    });
  });

  it('prefers explicit intent values and normalizes tag', () => {
    const constraints = resolveQuestionConstraints(
      {
        tag: '  TECH ',
        visibility: 'private',
        timeRange: 'this_weekend',
      },
      'show public events',
      events,
    );

    expect(constraints).toEqual({
      tag: 'tech',
      visibility: 'private',
      timeRange: 'this_weekend',
    });
  });

  it('applies tag, visibility and week filters', () => {
    const filtered = applyQuestionConstraints(
      events,
      {
        tag: 'tech',
        visibility: 'public',
        timeRange: 'this_week',
      },
      now,
    );

    expect(filtered.map((event) => event.id)).toEqual(['week-public-tech']);
  });

  it('applies weekend filter', () => {
    // Weekend window is computed from current mocked week context.
    const filtered = applyQuestionConstraints(
      events,
      {
        timeRange: 'this_weekend',
      },
      now,
    );

    expect(filtered.map((event) => event.id)).toEqual([
      'week-public-tech',
      'week-private-tech',
    ]);
  });

  it('builds filtered title with visibility and range suffixes', () => {
    expect(
      buildFilteredTitle('Upcoming events', {
        visibility: 'public',
        timeRange: 'this_week',
      }),
    ).toBe('Upcoming events (public) this week');
  });
});
