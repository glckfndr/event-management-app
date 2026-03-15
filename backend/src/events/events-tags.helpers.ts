import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Tag } from '../tags/entities/tag.entity';
import { MAX_EVENT_TAGS } from './events-validation.helpers';

export const resolveEventTags = async (
  tagsRepository: Pick<Repository<Tag>, 'find' | 'save' | 'create'>,
  tags?: string[],
  maxEventTags = MAX_EVENT_TAGS,
): Promise<Tag[]> => {
  if (!tags || tags.length === 0) {
    return [];
  }

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

  const existingTags = await tagsRepository.find({
    where: normalizedTags.map((name) => ({ name })),
  });

  const existingByName = new Map(existingTags.map((tag) => [tag.name, tag]));
  const missingNames = normalizedTags.filter(
    (name) => !existingByName.has(name),
  );

  if (missingNames.length === 0) {
    return normalizedTags
      .map((name) => existingByName.get(name))
      .filter((tag): tag is Tag => Boolean(tag));
  }

  let newTags: Tag[] = [];

  try {
    newTags = await tagsRepository.save(
      missingNames.map((name) => tagsRepository.create({ name })),
    );
  } catch {
    // Another request may have inserted the same normalized tag names.
    const refreshedTags = await tagsRepository.find({
      where: normalizedTags.map((name) => ({ name })),
    });

    const refreshedByName = new Map(
      refreshedTags.map((tag) => [tag.name, tag]),
    );

    return normalizedTags
      .map((name) => refreshedByName.get(name))
      .filter((tag): tag is Tag => Boolean(tag));
  }

  for (const tag of newTags) {
    existingByName.set(tag.name, tag);
  }

  return normalizedTags
    .map((name) => existingByName.get(name))
    .filter((tag): tag is Tag => Boolean(tag));
};
