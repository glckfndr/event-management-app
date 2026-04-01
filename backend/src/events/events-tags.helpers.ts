import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Tag } from '../tags/entities/tag.entity';
import { MAX_EVENT_TAGS } from './events-validation.helpers';

type TagsRepository = Pick<Repository<Tag>, 'find' | 'save' | 'create'>;

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
  } catch {
    // Recover from concurrent insert races by re-reading normalized names.
    return loadRefreshedResolvedTags(tagsRepository, normalizedTags);
  }

  for (const tag of createdTags) {
    existingByName.set(tag.name, tag);
  }

  return mapNamesToExistingTags(normalizedTags, existingByName);
};
