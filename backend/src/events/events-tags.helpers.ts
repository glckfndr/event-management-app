import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Tag } from '../tags/entities/tag.entity';
import { MAX_EVENT_TAGS } from './events-validation.helpers';

type TagsRepository = Pick<Repository<Tag>, 'find' | 'save' | 'create'>;
type DriverErrorCode = {
  code?: string;
  errno?: number;
};

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

const isUniqueViolationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code =
    (error as { code?: string }).code ??
    (error as { driverError?: DriverErrorCode }).driverError?.code;

  return code === POSTGRES_UNIQUE_VIOLATION_CODE;
};

const normalizeAndValidateTagNames = (
  tags: string[] | undefined,
  maxEventTags: number,
): string[] => {
  if (!tags || tags.length === 0) {
    return [];
  }

  // Normalize early so uniqueness and max-limit checks are deterministic.
  const normalizedTags = [
    ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ];

  if (normalizedTags.length === 0) {
    return [];
  }

  if (normalizedTags.length > maxEventTags) {
    throw new BadRequestException(
      `Maximum ${maxEventTags} tags are allowed per event`,
    );
  }

  return normalizedTags;
};

const mapTagsByName = (tags: Tag[]): Map<string, Tag> =>
  new Map(tags.map((tag) => [tag.name, tag]));

const mapNamesToExistingTags = (
  normalizedTags: string[],
  tagsByName: Map<string, Tag>,
): Tag[] =>
  // Return tags in the same order as user input after normalization.
  normalizedTags
    .map((name) => tagsByName.get(name))
    .filter((tag): tag is Tag => Boolean(tag));

const loadExistingTagsByName = async (
  tagsRepository: TagsRepository,
  normalizedTags: string[],
): Promise<Map<string, Tag>> => {
  const existingTags = await tagsRepository.find({
    where: normalizedTags.map((name) => ({ name })),
  });

  return mapTagsByName(existingTags);
};

const createMissingTags = async (
  tagsRepository: TagsRepository,
  missingNames: string[],
): Promise<Tag[]> =>
  tagsRepository.save(
    missingNames.map((name) => tagsRepository.create({ name })),
  );

const loadRefreshedResolvedTags = async (
  tagsRepository: TagsRepository,
  normalizedTags: string[],
): Promise<Tag[]> => {
  const refreshedTagsByName = await loadExistingTagsByName(
    tagsRepository,
    normalizedTags,
  );

  return mapNamesToExistingTags(normalizedTags, refreshedTagsByName);
};

export const resolveEventTags = async (
  tagsRepository: TagsRepository,
  tags?: string[],
  maxEventTags = MAX_EVENT_TAGS,
): Promise<Tag[]> => {
  const normalizedTags = normalizeAndValidateTagNames(tags, maxEventTags);

  if (normalizedTags.length === 0) {
    return [];
  }

  const existingByName = await loadExistingTagsByName(
    tagsRepository,
    normalizedTags,
  );
  const missingNames = normalizedTags.filter(
    (name) => !existingByName.has(name),
  );

  if (missingNames.length === 0) {
    return mapNamesToExistingTags(normalizedTags, existingByName);
  }

  let createdTags: Tag[] = [];

  try {
    createdTags = await createMissingTags(tagsRepository, missingNames);
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    // Recover from concurrent insert races only for expected unique conflicts.
    return loadRefreshedResolvedTags(tagsRepository, normalizedTags);
  }

  for (const tag of createdTags) {
    existingByName.set(tag.name, tag);
  }

  return mapNamesToExistingTags(normalizedTags, existingByName);
};
