---
name: github-delivery-workflow
description: Enforces safe git workflow and generates GitHub-ready title, description, and comment text for direct copy-paste.
---

# GitHub Delivery Workflow

## Purpose

Use this skill when the user asks for:

- commit/push workflow help,
- branch safety checks,
- GitHub field text (title, description, comment),
- PR-ready summaries.

This skill prioritizes safe branching and copy-paste-ready GitHub output.

## Branch Safety Rules

1. Before commit or push, check current branch and report it.
2. Expected working branch: feature/optional-frontend-enhancements.
3. If branch is different, stop and ask for confirmation.
4. Never commit or push to main unless explicitly requested.
5. Before pushing, show the planned commit message and target branch; wait for explicit user confirmation.
6. Do not amend or force-push unless explicitly requested.

## Branch Policy (Task Flow)

Single source of truth: follow the Branch Policy section in .github/copilot-instructions.md.

When user provides <BASE_BRANCH> and <ISSUE_BRANCH>, enforce that policy exactly:

1. Work only in <ISSUE_BRANCH>.
2. Sync <ISSUE_BRANCH> with origin/<BASE_BRANCH> before PR.
3. Run relevant tests after sync.
4. Open PR only as <ISSUE_BRANCH> -> <BASE_BRANCH>.

## Validation Rules

1. Before frontend commit, run: npm run test:run (from frontend/).
2. Report test result in chat before commit/push.
3. If tests fail, do not claim completion.

## Commit Message Rules

1. Use Conventional Commit style: type(scope): short description.
2. Prefer these types for frontend work:

- refactor(frontend)
- test(frontend)
- docs(frontend)

## GitHub Field Output Rules

When user asks for title/description/comment:

1. Return direct copy-paste-ready text.
2. Avoid extra explanation unless explicitly asked.
3. If multiple fields requested, output separate labeled blocks:

- Title
- Description
- Comment

Field-specific formatting:

- Title: concise, ideally up to 72 characters.
- Description: use sections when relevant:
  - What changed
  - Why
  - Validation
  - Risks/Notes
- Comment: actionable, context-specific, no filler.

## Templates

Title
refactor(frontend): move assistant selectors to AssistantPanel

Description
What changed

- Moved assistant selectors from EventsPage to AssistantPanel.
- Removed pass-through props that were only forwarded.

Why

- Keep page-level components focused on orchestration.
- Reduce prop duplication and improve component ownership.

Validation

- Ran frontend test suite: npm run test:run
- Result: 39/39 tests passed.

Risks/Notes

- No behavior changes expected.

Comment
Updated based on review feedback.
Moved the state/selectors into the component where they are used, removed pass-through props, and re-ran tests (39/39 passing).

## Response Language

Default response language is Ukrainian unless user requests another language.

## Frontend Refactor Recommendation (EventsPage Pattern)

Use this recommendation when refactoring page components in frontend.

Goal: keep page components as orchestration layers, and move feature-specific state/logic to the child component that actually uses it.

Apply this pattern:

1. If a page reads store state only to pass it down, move that selector/state access into the child component.
2. If a page defines handlers used only by one child, move those handlers into that child when safe.
3. Keep page responsibilities minimal: route guards, high-level data fetch, and composition of sections.
4. Prefer thin, explicit child contracts (for example, `onSubmit(question)` instead of passing raw event and multiple setter props).
5. For repeated JSX blocks with a clear responsibility (search bar, filter bar, action panel), extract them into dedicated components.
6. After each meaningful refactor, run frontend tests and report results before commit.

Quick check before commit:

- Is the page still doing mostly orchestration?
- Did prop-drilling and pass-through props decrease?
- Is behavior unchanged and covered by tests?
