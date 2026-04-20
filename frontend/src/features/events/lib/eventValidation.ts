export const EVENT_TITLE_MIN_LENGTH = 3;
export const EVENT_DESCRIPTION_MIN_LENGTH = 10;
export const EVENT_LOCATION_MIN_LENGTH = 2;
export const EVENT_MAX_TAGS = 5;

export const EVENT_VALIDATION_MESSAGES = {
  titleRequired: "Title is required",
  titleMinLength: `Title must be at least ${EVENT_TITLE_MIN_LENGTH} characters`,
  createTitleRequired: "Event title is required",
  createTitleMinLength: `Event title must be at least ${EVENT_TITLE_MIN_LENGTH} characters`,
  descriptionRequired: "Description is required",
  descriptionMinLength: `Description must be at least ${EVENT_DESCRIPTION_MIN_LENGTH} characters`,
  dateRequired: "Date is required",
  timeRequired: "Time is required",
  locationRequired: "Location is required",
  locationMinLength: `Location must be at least ${EVENT_LOCATION_MIN_LENGTH} characters`,
  capacityPositive: "Capacity must be a positive whole number",
  createCapacityPositive: "Capacity must be a positive whole number",
  tagsMaxCount: `You can select up to ${EVENT_MAX_TAGS} tags`,
  tagMustNotBeEmpty: "Tag cannot be empty",
};

export type EventCoreValidationValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: string;
};

export const isValidPositiveCapacityInput = (
  value: string | null | undefined,
) => {
  if (!value || value.trim() === "") {
    return true;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

export const normalizeEventCoreValues = <T extends EventCoreValidationValues>(
  values: T,
) => ({
  ...values,
  title: values.title.trim(),
  description: values.description.trim(),
  location: values.location.trim(),
});

export const validateEventCoreFields = (
  values: EventCoreValidationValues,
): string | null => {
  const normalized = normalizeEventCoreValues(values);

  if (!normalized.title) {
    return EVENT_VALIDATION_MESSAGES.titleRequired;
  }

  if (normalized.title.length < EVENT_TITLE_MIN_LENGTH) {
    return EVENT_VALIDATION_MESSAGES.titleMinLength;
  }

  if (!normalized.description) {
    return EVENT_VALIDATION_MESSAGES.descriptionRequired;
  }

  if (normalized.description.length < EVENT_DESCRIPTION_MIN_LENGTH) {
    return EVENT_VALIDATION_MESSAGES.descriptionMinLength;
  }

  if (!normalized.date) {
    return EVENT_VALIDATION_MESSAGES.dateRequired;
  }

  if (!normalized.time) {
    return EVENT_VALIDATION_MESSAGES.timeRequired;
  }

  if (!normalized.location) {
    return EVENT_VALIDATION_MESSAGES.locationRequired;
  }

  if (normalized.location.length < EVENT_LOCATION_MIN_LENGTH) {
    return EVENT_VALIDATION_MESSAGES.locationMinLength;
  }

  if (!isValidPositiveCapacityInput(normalized.capacity)) {
    return EVENT_VALIDATION_MESSAGES.capacityPositive;
  }

  return null;
};
