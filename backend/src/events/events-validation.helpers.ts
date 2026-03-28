import { BadRequestException } from '@nestjs/common';

export const MAX_FILTER_TAGS = 5;
export const MAX_EVENT_TAGS = 5;

export const parseAndValidateEventDate = (value: string): Date => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('Event date is invalid');
  }

  // New events must be scheduled in the future.
  if (parsedDate.getTime() <= Date.now()) {
    throw new BadRequestException('Event date cannot be in the past');
  }

  return parsedDate;
};

export const parseTagsFilter = (
  tagsFilter?: string,
  maxFilterTags = MAX_FILTER_TAGS,
): string[] => {
  if (!tagsFilter?.trim()) {
    return [];
  }

  // Normalize for case-insensitive filtering and remove duplicate query tags.
  const normalizedTags = [
    ...new Set(
      tagsFilter
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (normalizedTags.length > maxFilterTags) {
    throw new BadRequestException(
      `Maximum ${maxFilterTags} filter tags are allowed`,
    );
  }

  return normalizedTags;
};
