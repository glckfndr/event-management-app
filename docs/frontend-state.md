# Frontend State Rules

This project intentionally uses both Redux Toolkit and Zustand.

## Why both

- Redux Toolkit handles domain and server-backed state.
- Zustand handles small local UI state where Redux boilerplate is unnecessary.

## Use Redux Toolkit for

- Auth/session state (`auth` slice).
- Events domain data (`events` slice): lists, selected event, request status, API errors.
- Async actions that call backend APIs.
- Any state required across multiple pages and business flows.

## Use Zustand for

- Localized UI-only state not needed as global domain state.
- Ephemeral UX helpers tied to one feature/page.
- Example in this codebase:
  - Assistant panel UI state (`assistantUiStore`):
    - `assistantQuestion`
    - recent assistant questions persistence (`localStorage`)

## Guardrails

- Do not duplicate the same state in Redux and Zustand.
- If state becomes domain-relevant or shared across broad app flows, migrate to Redux.
- If state is purely local UI behavior and no async/business orchestration is needed, keep it in Zustand.
- Keep store boundaries explicit in code reviews.

## Current source of truth

- Redux store setup: `frontend/src/app/store.ts`
- Redux hooks: `frontend/src/app/hooks.ts`
- Zustand assistant UI store: `frontend/src/features/events/assistantUiStore.ts`
- Redux events domain slice: `frontend/src/features/events/eventsSlice.ts`
