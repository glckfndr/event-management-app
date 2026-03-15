export type AssistantEvent = {
  id: string;
  title: string;
  eventDate: Date;
  visibility: 'public' | 'private';
  organizerId: string;
  location?: string | null;
  tags: string[];
  participantIds: string[];
  participantLabels: string[];
};

export type AssistantQuestionIntent = {
  intent:
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
  date?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
  eventTitle?: string;
  visibility?: 'public' | 'private';
  timeRange?: 'this_weekend' | 'this_week';
};
