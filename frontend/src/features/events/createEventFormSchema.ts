import * as yup from "yup";
import type { EventVisibility } from "../../types/event";
import {
  EVENT_DESCRIPTION_MIN_LENGTH,
  EVENT_MAX_TAGS,
  EVENT_LOCATION_MIN_LENGTH,
  EVENT_TITLE_MIN_LENGTH,
  EVENT_VALIDATION_MESSAGES,
  isValidPositiveCapacityInput,
} from "../../shared/eventValidation";

export const createEventSchema = yup
  .object({
    title: yup
      .string()
      .trim()
      .min(
        EVENT_TITLE_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.createTitleMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.createTitleRequired),
    description: yup
      .string()
      .trim()
      .min(
        EVENT_DESCRIPTION_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.descriptionMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.descriptionRequired),
    eventDate: yup.string().required(EVENT_VALIDATION_MESSAGES.dateRequired),
    eventTime: yup.string().required(EVENT_VALIDATION_MESSAGES.timeRequired),
    location: yup
      .string()
      .trim()
      .min(
        EVENT_LOCATION_MIN_LENGTH,
        EVENT_VALIDATION_MESSAGES.locationMinLength,
      )
      .required(EVENT_VALIDATION_MESSAGES.locationRequired),
    capacity: yup
      .string()
      .test(
        "valid-capacity",
        EVENT_VALIDATION_MESSAGES.createCapacityPositive,
        (value) => isValidPositiveCapacityInput(value),
      ),
    visibility: yup
      .mixed<EventVisibility>()
      .oneOf(["public", "private"], "Select event visibility")
      .required("Visibility is required"),
    tags: yup
      .array()
      .of(
        yup
          .string()
          .trim()
          .min(1, EVENT_VALIDATION_MESSAGES.tagMustNotBeEmpty)
          .max(50),
      )
      .max(EVENT_MAX_TAGS, EVENT_VALIDATION_MESSAGES.tagsMaxCount)
      .default([]),
  })
  .required();

export type CreateEventFormValues = yup.InferType<typeof createEventSchema>;
