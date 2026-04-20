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

export const resolveEventTags = async (
  tagsRepository: TagsRepository,
  tags?: string[],
  maxEventTags = MAX_EVENT_TAGS,
): Promise<Tag[]> => {
  const normalizedTags = normalizeAndValidateTagNames(tags, maxEventTags);

  if (normalizedTags.length === 0) {
    return [];
  }

  const loadByName = async (): Promise<Map<string, Tag>> => {
    const existingTags = await tagsRepository.find({
      where: normalizedTags.map((name) => ({ name })),
    });

    return new Map(existingTags.map((tag) => [tag.name, tag]));
  };

  const resolveFromMap = (tagsByName: Map<string, Tag>): Tag[] =>
    // Preserve user order after normalization.
    normalizedTags
      .map((name) => tagsByName.get(name))
      .filter((tag): tag is Tag => Boolean(tag));

  let tagsByName = await loadByName();
  const missingNames = normalizedTags.filter((name) => !tagsByName.has(name));

  if (missingNames.length > 0) {
    try {
      const createdTags = await tagsRepository.save(
        missingNames.map((name) => tagsRepository.create({ name })),
      );

      createdTags.forEach((tag) => tagsByName.set(tag.name, tag));
    } catch (error) {
      if (!isUniqueViolationError(error)) {
        throw error;
      }

      // Another request may have created missing tags between find and save.
      tagsByName = await loadByName();
    }
  }

  return resolveFromMap(tagsByName);
};
