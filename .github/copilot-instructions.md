# Repository Copilot Instructions

Use these instructions for all changes in this repository.

## Commit Style

- Use Conventional Commit style for commit messages.
- Format: `type(scope): short description`
- For frontend refactors, prefer messages like:
  - `refactor(frontend): ...`
  - `test(frontend): ...`
  - `docs(frontend): ...`

## Git Workflow

- Expected working branch by default: `feature/optional-frontend-enhancements`.
- Never commit or push to `main` unless the user explicitly asks.
- Before each commit or push, check and report the current branch in chat.
- If the branch does not match the expected branch, stop and ask for confirmation.
- Before any frontend code commit, run `npm run test:run` (from `frontend/`) and report the result in chat.
- Before pushing, show the planned commit message and target branch; then wait for explicit user confirmation.
- Do not amend commits unless explicitly requested.
- Do not use force push unless explicitly requested.

## Branch Policy (Task Flow)

- Treat task branches with this policy when provided by the user.
- Base branch for task: `<BASE_BRANCH>`.
- Working branch: `<ISSUE_BRANCH>` created from `<BASE_BRANCH>`.
- Commit and push only to `<ISSUE_BRANCH>`.
- Do not push to `<BASE_BRANCH>` until PR is ready.
- Before PR, sync `<ISSUE_BRANCH>` with `origin/<BASE_BRANCH>` (merge or rebase), then resolve conflicts.
- After sync, run relevant tests.
- Open PR only after sync and tests: `<ISSUE_BRANCH>` -> `<BASE_BRANCH>`.

### Concrete Example

- Base branch: `feature/stage-2-tags-ai`.
- Working branch: `feature/issue-13-tests-docs-update`.
- Push/commit only to `feature/issue-13-tests-docs-update`.
- Before PR, sync with `origin/feature/stage-2-tags-ai`, run tests, then open:
  `feature/issue-13-tests-docs-update` -> `feature/stage-2-tags-ai`.

## Refactor Preferences

- When a value/function in a page component is only passed through and not used there, prefer moving that logic/selectors into the child component that actually uses it.
- Keep parent pages focused on orchestration and high-level flow.
- Avoid unnecessary prop duplication.

## Code Comment Preference

- Prefer short comments that explain why code exists or why a specific decision was made.
- Add comments mainly around non-obvious logic, trade-offs, constraints, or safety checks.
- Avoid comments that only restate what the code does line by line.
- Keep comments concise and practical.

## Validation

- After meaningful frontend changes, run the frontend test suite:
  - `npm run test:run` (from `frontend/`)
- Do not claim success without verifying tests or diagnostics.

## Safety

- Preserve existing behavior during refactors.
- If behavior must change, call it out explicitly before committing.

## Communication

- Default assistant responses should be in Ukrainian unless the user asks otherwise.
- Keep responses concise and practical; avoid repeating unchanged context.

## Pull Request Notes

- When asked for a PR summary, include:
  - What changed (grouped by file/component)
  - Why it changed
  - Validation performed (tests/diagnostics)
  - Any behavior changes or known risks

## GitHub Field Formatting

- When asked to provide a GitHub `title`, `description`, or `comment`, return text in a direct copy-paste-ready format.
- Prefer plain text blocks without extra explanation around them unless the user explicitly asks for alternatives.
- If multiple fields are requested, output each field in a clearly separated block with labels: `Title`, `Description`, `Comment`.
- `Title`: keep concise, ideally up to 72 characters.
- `Description`: prefer this structure when relevant: `What changed`, `Why`, `Validation`, `Risks/Notes`.
- `Comment`: keep actionable and context-specific; avoid generic filler.

### Templates

Use these templates when the user asks for direct GitHub field text.

Title

```
refactor(frontend): move assistant selectors to AssistantPanel
```

Description

```
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
```

Comment

```
Updated based on review feedback.
Moved the state/selectors into the component where they are used, removed pass-through props, and re-ran tests (39/39 passing).
```
