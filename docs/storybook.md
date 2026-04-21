# Storybook Guide

## Quick Start

From repository root:

```bash
npm --prefix frontend run storybook
```

Or from `frontend` folder:

```bash
npm run storybook
```

Default URL:

- `http://localhost:6006`

## Build Static Storybook

From repository root:

```bash
npm --prefix frontend run build-storybook
```

Output folder:

- `frontend/storybook-static/`

## Where Stories Are Located

Storybook loads files matching:

- `frontend/src/**/*.stories.tsx`

Current examples include:

- `frontend/src/components/ui/Button.stories.tsx`
- `frontend/src/components/ui/FormField.stories.tsx`
- `frontend/src/components/ui/DatePickerInput.stories.tsx`
- `frontend/src/components/ui/VisibilityFieldset.stories.tsx`
- `frontend/src/components/assistant/AssistantPanel.stories.tsx`
- `frontend/src/features/events/ui/event-details/EventCard.stories.tsx`
- `frontend/src/features/events/ui/event-form/EventTagsField.stories.tsx`

## Troubleshooting

- Port is busy:

```bash
npm --prefix frontend run storybook -- --port 6007
```

- Stories are missing:
  - Ensure file name ends with `.stories.tsx`.
  - Ensure file is under `frontend/src`.
  - Restart Storybook after adding new files.

- Type/lint errors in stories:
  - For components with required props managed in `render`, use a wrapper component and a narrowed args type (`Omit<...>`).
  - Avoid calling hooks directly in anonymous `render` functions; call hooks inside a named React component.

## Related Docs

- `frontend/README.md` (frontend commands)
- `docs/frontend-state.md` (Redux vs Zustand rules)
