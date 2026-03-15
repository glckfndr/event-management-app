# Backend Architecture Guide

This document defines lightweight rules to keep the backend maintainable as the project grows.

## Goals

- Keep feature behavior easy to find.
- Keep services focused on orchestration.
- Keep pure business rules testable in small units.
- Avoid accidental over-fragmentation.

## Module Structure

Each feature module under `src/` should prefer this layout:

- `*.controller.ts`: HTTP layer only (validation decorators, request mapping, response shaping).
- `*.service.ts`: orchestration layer (repository calls, transactions, helper composition).
- `*.helpers.ts`: pure or mostly pure business logic.
- `dto/`: request/response contracts.
- `entities/`: ORM entities.
- `*.spec.ts`: tests.

Current examples:

- `src/assistant/assistant.service.ts` orchestrates flow.
- `src/assistant/assistant-answer.helpers.ts` keeps answer-generation rules.
- `src/events/events.service.ts` orchestrates persistence and transactions.
- `src/events/events-validation.helpers.ts` and `src/events/events-tags.helpers.ts` keep focused logic.

## Service Rules

A service method should typically:

1. Load data from repositories.
2. Call helper functions for business rules.
3. Persist changes.
4. Return domain result.

Avoid in services:

- Large regex/formatting blocks.
- Duplicated normalization logic.
- Repeated conditional trees that can be named helpers.

## Helper Rules

Use helpers when logic is:

- Reused in more than one method.
- Pure (input -> output, no I/O).
- Complex enough to deserve a name.
- Easier to test independently.

Keep helpers cohesive:

- `*-validation.helpers.ts`: parse/validate checks.
- `*-tags.helpers.ts`: tag-specific logic.
- `*-participation.helpers.ts`: participant/join guards.
- `*-text.helpers.ts`: text matching/parsing/formatting.

## File Size Guidance

These are heuristics, not hard limits:

- `service.ts`: target 150-300 lines.
- `helpers.ts`: target 80-250 lines.
- If a file exceeds ~300 lines and contains multiple concerns, split by concern.

Prefer splitting by domain concept, not by arbitrary line count.

## Testing Strategy

- Service specs validate integration of orchestration + repository interactions.
- Helper specs validate pure rules and edge cases.
- When extracting logic from a service into helpers, preserve existing service tests first, then add helper unit tests.

## Naming Conventions

- Keep names action-oriented: `parseAndValidateEventDate`, `resolveEventTags`, `assertCapacityAvailable`.
- Use `assert*` for guard functions that throw.
- Use `resolve*` for derived/calculated values that may perform lookups.
- Use `format*` for presentation-only transformations.

## Refactor Checklist

Before splitting code:

1. Identify duplicated logic or mixed concerns.
2. Extract smallest meaningful helper with clear name.
3. Keep behavior unchanged.
4. Run focused tests for affected module.
5. Commit refactor separately from feature changes.

## Practical Boundary for This Project

- Keep `assistant.service.ts` and `events.service.ts` as orchestration hubs.
- Keep answer/query parsing in assistant helpers.
- Keep event validation/tag/participation rules in events helpers.
- Prefer one logical commit per refactor slice.
