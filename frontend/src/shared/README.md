# Shared Layer Boundaries

`shared` is for cross-feature primitives only.

Allowed categories:

- `shared/api/`: global API client setup and auth-header helpers used by multiple features.
- `shared/lib/`: framework-agnostic utilities reused by multiple features/pages.

Do not place feature-owned logic here.

Move code to a feature module when it:

- Depends on feature domain types (for example, events entities).
- Is used by one feature only.
- Encodes feature-specific UI behavior or style decisions.

Current ownership examples:

- Events date/time input helpers: `features/events/lib/dateTimeInput.ts`
- Events tag accent helpers: `features/events/lib/tagAccent.ts`
