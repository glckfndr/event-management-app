---
name: kiss-review
description: Reviews code for KISS (Keep It Simple, Stupid) principle violations and suggests targeted simplifications. USE FOR: analyzing new or existing code for unnecessary complexity, over-abstraction, redundant indirection, and duplicate logic. Covers both frontend (React/RTK/Zustand) and backend (NestJS/TypeORM).
---

# KISS Review Skill

## Purpose

Use this skill when the user asks to:

- Review code for KISS principle compliance.
- Identify unnecessary complexity or over-engineering.
- Suggest simplifications for existing code.
- Check a PR or file for KISS violations before committing.

KISS = the simplest solution that correctly solves the problem. Not fewer lines — less unnecessary complexity.

## When KISS Is Violated

A piece of code violates KISS when:

1. **Duplicate logic** — the same rule, type, or query is defined in two places.
2. **Zero-value abstraction** — a helper/wrapper does nothing except forward unchanged inputs.
3. **One-call helper** — a function is extracted but called only once; inline is equally clear.
4. **Inconsistent abstraction** — an abstraction is introduced but only partially used (some call sites bypass it).
5. **Over-indexing** — more variants/tokens computed than any realistic user input would need.
6. **Workaround patterns** — unusual idioms used only to silence linter warnings (e.g., `void x`).
7. **Structural ceremony** — grouping props or data into nested objects purely for organization when flat is equally readable at the same scale.

## Red Flags by Layer

### Frontend (React)

- A wrapper component that renders one child with all props forwarded unchanged → inline the child.
- Two form validation systems (imperative + schema) encoding the same rules → merge into one.
- Props grouped into `{ state: {...}, handlers: {...} }` objects for fewer than ~15 total props → flatten to direct props.
- A hook that builds multiple format variants for a simple filter → use `toLocaleString()` or one format token.
- A top-level action lifecycle (busy/error) partially bypassed in one handler → apply the lifecycle uniformly.
- A component that independently fetches data already fetched by its parent page → lift the fetch to the page.

### Backend (NestJS / TypeORM)

- A type exported from two files with structurally identical definitions → keep one in `*.types.ts`, import everywhere.
- `void unusedVar` to silence a lint warning → use `_unusedVar` naming convention instead.
- A helper function called exactly once → inline the logic at the call site.
- Two repository `.find()` calls that differ only in one `where` condition → build `where` conditionally, call `.find()` once.
- A multi-step `.map().map()` chain where the intermediate object exists only to carry a typed cast → use a local `const` cast inside a single `.map()`.
- A multi-level fallback cascade where intermediate helpers partially overlap in responsibility → consolidate into a clear decision tree.

## How to Fix (Patterns)

### Duplicate type / dual definition

```ts
// Before: same shape in two files
// assistant-llm.service.ts
export type AssistantQuestionIntent = { intent: 'count_total' | ... };

// assistant.types.ts
export type AssistantQuestionIntent = { intent: 'count_total' | ... };

// After: one definition, derive aliases
// assistant.types.ts — single source
export type AssistantQuestionIntent = { intent: 'count_total' | ... };

// assistant-llm.service.ts — derive, do not re-declare
import type { AssistantQuestionIntent } from './assistant.types';
type AssistantIntentName = AssistantQuestionIntent['intent'];
```

### One-call extracted helper

```ts
// Before: helper called once
function buildFindOneRelations(user?: User) {
  return user ? { ..., participants: { user: true } } : { ..., participants: true };
}
const relations = buildFindOneRelations(user);

// After: inline ternary
const relations = user
  ? { organizer: true, participants: { user: true }, tags: true }
  : { organizer: true, participants: true, tags: true };
```

### Duplicate repository query

```ts
// Before: two nearly identical find() calls
if (tags.length > 0) {
  return repo.find({ where: { visibility, tags: { name: In(tags) } }, ... });
}
return repo.find({ where: { visibility }, ... });

// After: conditional where, one call
const where = tags.length > 0
  ? { visibility, tags: { name: In(tags) } }
  : { visibility };
return repo.find({ where, ... });
```

### Double .map() for a typed cast

```ts
// Before: intermediate object only for TypeScript cast
events
  .map(e => ({ relationData: e as EnrichedEvent, id: e.id, ... }))
  .map(({ relationData, ...rest }) => ({ ...rest, tags: relationData.tags ?? [] }));

// After: local const for the cast, single .map()
events.map(e => {
  const enriched = e as EnrichedEvent;
  return { id: e.id, ..., tags: enriched.tags ?? [] };
});
```

### Nested prop groups

```ts
// Before: grouped for ceremony, not necessity
<MyComponent
  state={{ token, isOrganizer, isBusy }}
  handlers={{ onJoin, onLeave, onBack }}
/>

// After: flat props
<MyComponent
  token={token}
  isOrganizer={isOrganizer}
  isBusy={isBusy}
  onJoin={onJoin}
  onLeave={onLeave}
  onBack={onBack}
/>
```

### Inconsistent async lifecycle

```ts
// Before: runBusyAction abstraction exists but handleDelete bypasses it
const handleDelete = async () => {
  setIsBusy(true);
  setError(null);
  try { ... } catch { setError(...); setIsBusy(false); }
};

// After: all mutations use runBusyAction
const handleDelete = async () => {
  await runBusyAction(
    () => dispatch(deleteEvent(id)).unwrap(),
    'Failed to delete event',
    async () => { await dispatch(fetchPublicEvents()).unwrap(); navigate(returnTo); },
  );
};
```

### Unused variable suppress

```ts
// Before: void used as a linter suppress
const { email, ...rest } = user;
void email;

// After: idiomatic prefix convention
const { email: _email, ...rest } = user;
```

## KISS Review Checklist

Run this when reviewing a PR or before committing a refactor:

- [ ] Are there any types, interfaces, or constants defined in more than one file?
- [ ] Are there helper functions called only once? Could they be inlined?
- [ ] Are there wrapper components or functions that only forward their inputs?
- [ ] Are there multiple conditional branches that produce structurally similar outputs? (duplicate query / dual map / parallel validation)
- [ ] Is there an abstraction that some call sites bypass? (inconsistent use = the abstraction is not providing value)
- [ ] Are there unusual idioms (`void x`, `as unknown as`, double `.map()`) that signal a workaround?
- [ ] Are there more computed variants than real inputs would realistically trigger?
- [ ] Are props grouped into nested objects when flat props are equally readable at this scale?

## Severity Guide

| Severity | Criteria | Action |
|---|---|---|
| **Strong** | Rule change requires updates in 2+ places; or a structurally identical definition exists twice | Fix before commit |
| **Medium** | Complexity adds cognitive load without proportional benefit; workaround affects readability | Fix or document trade-off |
| **Minor** | Small ceremony or indirection; isolated, low risk of bugs | Fix opportunistically |

## Response Language

Default response language is Ukrainian unless user requests another language.
